import { applyReturnCard, DomainRuleError } from '@munchinking/domain';
import {
  cursorPaginationInputSchema,
  movementTypeSchema,
  returnCardInputSchema,
  sendAdminNoticeInputSchema,
  uuidSchema
} from '@munchinking/shared';
import { TRPCError } from '@trpc/server';
import { getActiveSeason, changesOf, isUniqueConstraintError } from '../services/data';
import { getHistoryPage } from './history';
import { adminProcedure, router } from '../trpc/trpc';
import { newId, nowIso } from '../utils/ids';

const adminHistoryInput = cursorPaginationInputSchema.extend({
  managerId: uuidSchema.optional(),
  movementType: movementTypeSchema.optional()
});

export const adminRouter = router({
  history: adminProcedure.input(adminHistoryInput).query(async ({ ctx, input }) => {
    const season = await getActiveSeason(ctx.env.DB, ctx.auth.manager.leagueId);
    if (!season) return { items: [], nextCursor: null };
    return getHistoryPage({
      db: ctx.env.DB,
      seasonId: season.id,
      limit: input.limit,
      cursor: input.cursor,
      managerId: input.managerId,
      movementType: input.movementType
    });
  }),

  returnCard: adminProcedure.input(returnCardInputSchema).mutation(async ({ ctx, input }) => {
    const original = await ctx.env.DB.prepare(
      `SELECT m.id, m.season_id AS seasonId, m.card_copy_id AS cardCopyId,
              m.manager_id AS managerId, m.actor_user_id AS actorUserId,
              m.movement_type AS movementType, m.from_location AS fromLocation,
              m.to_location AS toLocation, m.target_manager_id AS targetManagerId,
              m.target_label AS targetLabel, m.whatsapp_message AS whatsappMessage,
              m.distribution_batch_id AS distributionBatchId,
              m.related_movement_id AS relatedMovementId, m.notes, m.created_at AS createdAt,
              c.card_definition_id AS cardDefinitionId, d.name AS cardName
       FROM card_movement m
       INNER JOIN card_copy c ON c.id = m.card_copy_id
       INNER JOIN card_definition d ON d.id = c.card_definition_id
       INNER JOIN manager g ON g.id = m.manager_id
       WHERE m.id = ? AND g.league_id = ? LIMIT 1`
    )
      .bind(input.movementId, ctx.auth.manager.leagueId)
      .first<{
        id: string;
        seasonId: string;
        cardCopyId: string;
        managerId: string;
        actorUserId: string | null;
        movementType: string;
        fromLocation: 'DECK' | 'HAND';
        toLocation: 'DECK' | 'HAND';
        targetManagerId: string | null;
        targetLabel: string | null;
        whatsappMessage: string | null;
        distributionBatchId: string | null;
        relatedMovementId: string | null;
        notes: string | null;
        createdAt: string;
        cardDefinitionId: string;
        cardName: string;
      }>();
    if (!original) throw new TRPCError({ code: 'NOT_FOUND', message: 'No se encontró la jugada.' });
    const season = await getActiveSeason(ctx.env.DB, ctx.auth.manager.leagueId);
    if (!season || original.seasonId !== season.id || original.movementType !== 'PLAYED') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Solo se pueden devolver jugadas de la temporada activa.'
      });
    }

    const alreadyReturned = await ctx.env.DB.prepare(
      `SELECT id FROM card_movement WHERE related_movement_id = ? AND movement_type = 'RETURNED' LIMIT 1`
    )
      .bind(original.id)
      .first<{ id: string }>();
    const [handRow, deckCopy] = await Promise.all([
      ctx.env.DB.prepare(
        `SELECT COUNT(*) AS handCount FROM card_copy
         WHERE season_id = ? AND current_manager_id = ? AND location = 'HAND'`
      )
        .bind(season.id, original.managerId)
        .first<{ handCount: number }>(),
      ctx.env.DB.prepare(
        `SELECT id, season_id AS seasonId, card_definition_id AS cardDefinitionId,
                current_manager_id AS currentManagerId, location, created_at AS createdAt
         FROM card_copy WHERE season_id = ? AND card_definition_id = ?
           AND location = 'DECK' AND current_manager_id IS NULL
         ORDER BY CASE WHEN id = ? THEN 0 ELSE 1 END, id LIMIT 1`
      )
        .bind(season.id, original.cardDefinitionId, original.cardCopyId)
        .first<{
          id: string;
          seasonId: string;
          cardDefinitionId: string;
          currentManagerId: string | null;
          location: 'DECK' | 'HAND';
          createdAt: string;
        }>()
    ]);
    if (!deckCopy)
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'No hay una copia disponible para devolver.'
      });

    const movementId = newId();
    const notificationId = newId();
    const timestamp = nowIso();
    let result;
    try {
      result = applyReturnCard({
        season: { id: season.id, isActive: true },
        playedMovement: {
          id: original.id,
          seasonId: original.seasonId,
          cardCopyId: original.cardCopyId,
          managerId: original.managerId,
          actorUserId: original.actorUserId,
          movementType: original.movementType as 'PLAYED',
          fromLocation: original.fromLocation,
          toLocation: original.toLocation,
          targetManagerId: original.targetManagerId,
          targetLabel: original.targetLabel,
          whatsappMessage: original.whatsappMessage,
          distributionBatchId: original.distributionBatchId,
          relatedMovementId: original.relatedMovementId,
          notes: original.notes,
          createdAt: original.createdAt
        },
        alreadyReturned: Boolean(alreadyReturned),
        deckCardCopyToReturn: deckCopy,
        cardDefinition: { name: original.cardName },
        recipientHandSize: handRow?.handCount ?? 0,
        adminUserId: ctx.auth.user.id,
        newMovementId: movementId,
        newNotificationId: notificationId,
        nowIso: timestamp,
        reason: input.reason
      });
    } catch (error) {
      if (error instanceof DomainRuleError) {
        const code =
          error.code === 'HAND_LIMIT_REACHED' || error.code === 'MOVEMENT_ALREADY_RETURNED'
            ? 'CONFLICT'
            : 'BAD_REQUEST';
        throw new TRPCError({ code, message: error.message });
      }
      throw error;
    }

    let results;
    try {
      results = await ctx.env.DB.batch([
        ctx.env.DB.prepare(
          `UPDATE card_copy SET location = 'HAND', current_manager_id = ?
           WHERE id = ? AND season_id = ? AND location = 'DECK' AND current_manager_id IS NULL
             AND (SELECT COUNT(*) FROM card_copy WHERE current_manager_id = ? AND season_id = ? AND location = 'HAND') < 3`
        ).bind(original.managerId, deckCopy.id, season.id, original.managerId, season.id),
        ctx.env.DB.prepare(
          `INSERT INTO card_movement
           (id, season_id, card_copy_id, manager_id, actor_user_id, movement_type, from_location,
            to_location, target_manager_id, target_label, whatsapp_message, distribution_batch_id,
            related_movement_id, notes, created_at)
           SELECT ?, ?, ?, ?, ?, 'RETURNED', 'DECK', 'HAND', NULL, NULL, NULL, NULL, ?, ?, ?
           WHERE changes() = 1`
        ).bind(
          movementId,
          season.id,
          deckCopy.id,
          original.managerId,
          ctx.auth.user.id,
          original.id,
          input.reason ?? null,
          timestamp
        ),
        ctx.env.DB.prepare(
          `INSERT INTO notification
           (id, manager_id, notification_type, title, message, related_movement_id, is_read, read_at, created_at)
           SELECT ?, ?, 'CARD_RETURNED', ?, ?, ?, 0, NULL, ?
           WHERE EXISTS (SELECT 1 FROM card_movement WHERE id = ? AND movement_type = 'RETURNED')`
        ).bind(
          notificationId,
          original.managerId,
          result.notification.title,
          result.notification.message,
          movementId,
          timestamp,
          movementId
        )
      ]);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Esta jugada ya fue devuelta.' });
      }
      throw error;
    }
    if (changesOf(results[0]) !== 1 || changesOf(results[1]) !== 1) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'La carta o la mano cambiaron; vuelve a intentarlo.'
      });
    }
    return {
      card: result.updatedCardCopy,
      movement: result.movement,
      notification: result.notification
    };
  }),

  sendNotice: adminProcedure.input(sendAdminNoticeInputSchema).mutation(async ({ ctx, input }) => {
    const recipientQuery = input.targetManagerId
      ? ctx.env.DB.prepare(
          `SELECT id FROM manager WHERE id = ? AND league_id = ? AND is_active = 1 LIMIT 1`
        ).bind(input.targetManagerId, ctx.auth.manager.leagueId)
      : ctx.env.DB.prepare(
          'SELECT id FROM manager WHERE league_id = ? AND is_active = 1 ORDER BY id'
        ).bind(ctx.auth.manager.leagueId);
    const recipients = await recipientQuery.all<{ id: string }>();
    if (input.targetManagerId && !recipients.results?.length) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'No se encontró el manager destinatario.'
      });
    }
    const timestamp = nowIso();
    if (!recipients.results?.length) return { deliveredCount: 0 };
    await ctx.env.DB.batch(
      recipients.results.map((recipient) =>
        ctx.env.DB.prepare(
          `INSERT INTO notification
         (id, manager_id, notification_type, title, message, related_movement_id, is_read, read_at, created_at)
         VALUES (?, ?, 'ADMIN_NOTICE', ?, ?, NULL, 0, NULL, ?)`
        ).bind(newId(), recipient.id, input.title, input.message, timestamp)
      )
    );
    return { deliveredCount: recipients.results.length };
  })
});
