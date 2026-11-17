import { cardCopy } from '@munchinking/db/schema';
import { applyDiscardCard, applyPlayCard, DomainRuleError } from '@munchinking/domain';
import { discardCardInputSchema, playCardInputSchema } from '@munchinking/shared';
import { eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { getActiveSeason, changesOf } from '../services/data';
import { newId, nowIso } from '../utils/ids';
import { protectedProcedure, router } from '../trpc/trpc';

export const cardsRouter = router({
  play: protectedProcedure.input(playCardInputSchema).mutation(async ({ ctx, input }) => {
    const season = await getActiveSeason(ctx.env.DB, ctx.auth.manager.leagueId);
    if (!season)
      throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'No hay temporada activa.' });

    const copy = await ctx.env.DB.prepare(
      `SELECT c.id, c.season_id AS seasonId, c.card_definition_id AS cardDefinitionId,
              c.current_manager_id AS currentManagerId, c.location, c.created_at AS createdAt,
              d.slug, d.name, d.nickname, d.description, d.usage_rules AS usageRules,
              d.rarity, d.target_type AS targetType, d.default_copies AS defaultCopies,
              d.image_url AS imageUrl, d.whatsapp_template AS whatsappTemplate,
              d.is_enabled AS isEnabled, d.created_at AS definitionCreatedAt
       FROM card_copy c INNER JOIN card_definition d ON d.id = c.card_definition_id
       WHERE c.id = ? LIMIT 1`
    )
      .bind(input.cardCopyId)
      .first<{
        id: string;
        seasonId: string;
        cardDefinitionId: string;
        currentManagerId: string | null;
        location: 'DECK' | 'HAND';
        createdAt: string;
        slug: string;
        name: string;
        nickname: string;
        description: string;
        usageRules: string;
        rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
        targetType: 'NONE' | 'MANAGER' | 'PLAYER' | 'FREE_TEXT';
        defaultCopies: number;
        imageUrl: string;
        whatsappTemplate: string;
        isEnabled: number;
        definitionCreatedAt: string;
      }>();
    if (!copy) throw new TRPCError({ code: 'NOT_FOUND', message: 'No se encontró la carta.' });

    const targetManager = input.targetManagerId
      ? await ctx.env.DB.prepare(
          `SELECT id, display_name AS displayName, league_id AS leagueId
           FROM manager WHERE id = ? AND league_id = ? AND is_active = 1 LIMIT 1`
        )
          .bind(input.targetManagerId, ctx.auth.manager.leagueId)
          .first<{ id: string; displayName: string; leagueId: string }>()
      : null;
    if (input.targetManagerId && !targetManager) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'El manager objetivo no está disponible en esta liga.'
      });
    }

    const now = nowIso();
    const movementId = newId();
    let result;
    try {
      result = applyPlayCard({
        season: { id: season.id, isActive: true },
        cardCopy: {
          id: copy.id,
          seasonId: copy.seasonId,
          cardDefinitionId: copy.cardDefinitionId,
          currentManagerId: copy.currentManagerId,
          location: copy.location,
          createdAt: copy.createdAt
        },
        definition: {
          id: copy.cardDefinitionId,
          slug: copy.slug,
          name: copy.name,
          nickname: copy.nickname,
          description: copy.description,
          usageRules: copy.usageRules,
          rarity: copy.rarity,
          targetType: copy.targetType,
          defaultCopies: copy.defaultCopies,
          imageUrl: copy.imageUrl,
          whatsappTemplate: copy.whatsappTemplate,
          isEnabled: copy.isEnabled === 1,
          createdAt: copy.definitionCreatedAt
        },
        actorManager: ctx.auth.manager,
        actorUserId: ctx.auth.user.id,
        target: { targetManager, targetLabel: input.targetLabel },
        movementId,
        nowIso: now,
        notes: input.notes,
        timeZone: ctx.env.APP_TIMEZONE ?? 'Europe/Madrid'
      });
    } catch (error) {
      if (error instanceof DomainRuleError) {
        const conflict = [
          'CARD_NOT_IN_HAND',
          'CARD_OWNERSHIP_MISMATCH',
          'CARD_SEASON_MISMATCH'
        ].includes(error.code);
        throw new TRPCError({
          code: conflict ? 'CONFLICT' : 'BAD_REQUEST',
          message: error.message
        });
      }
      throw error;
    }

    const writeResults = await ctx.env.DB.batch([
      ctx.env.DB.prepare(
        `UPDATE card_copy SET location = 'DECK', current_manager_id = NULL
         WHERE id = ? AND season_id = ? AND location = 'HAND' AND current_manager_id = ?`
      ).bind(copy.id, season.id, ctx.auth.manager.id),
      ctx.env.DB.prepare(
        `INSERT INTO card_movement
         (id, season_id, card_copy_id, manager_id, actor_user_id, movement_type, from_location,
          to_location, target_manager_id, target_label, whatsapp_message, distribution_batch_id,
          related_movement_id, notes, created_at)
         SELECT ?, ?, ?, ?, ?, 'PLAYED', 'HAND', 'DECK', ?, ?, ?, NULL, NULL, ?, ?
         WHERE changes() = 1`
      ).bind(
        result.movement.id,
        result.movement.seasonId,
        result.movement.cardCopyId,
        result.movement.managerId,
        result.movement.actorUserId,
        result.movement.targetManagerId,
        result.movement.targetLabel,
        result.whatsappMessage,
        result.movement.notes,
        result.movement.createdAt
      )
    ]);
    if (changesOf(writeResults[0]) !== 1 || changesOf(writeResults[1]) !== 1) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'La carta ya no está disponible en tu mano.'
      });
    }
    return {
      card: result.updatedCardCopy,
      movement: result.movement,
      whatsappMessage: result.whatsappMessage
    };
  }),

  discard: protectedProcedure.input(discardCardInputSchema).mutation(async ({ ctx, input }) => {
    const season = await getActiveSeason(ctx.env.DB, ctx.auth.manager.leagueId);
    if (!season)
      throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'No hay temporada activa.' });
    const [copy] = await ctx.db
      .select()
      .from(cardCopy)
      .where(eq(cardCopy.id, input.cardCopyId))
      .limit(1);
    if (!copy) throw new TRPCError({ code: 'NOT_FOUND', message: 'No se encontró la carta.' });

    const now = nowIso();
    const movementId = newId();
    let result;
    try {
      result = applyDiscardCard({
        season: { id: season.id, isActive: true },
        cardCopy: {
          id: copy.id,
          seasonId: copy.seasonId,
          cardDefinitionId: copy.cardDefinitionId,
          currentManagerId: copy.currentManagerId,
          location: copy.location,
          createdAt: copy.createdAt
        },
        actorManager: ctx.auth.manager,
        actorUserId: ctx.auth.user.id,
        movementId,
        nowIso: now
      });
    } catch (error) {
      if (error instanceof DomainRuleError) {
        throw new TRPCError({ code: 'CONFLICT', message: error.message });
      }
      throw error;
    }

    const writeResults = await ctx.env.DB.batch([
      ctx.env.DB.prepare(
        `UPDATE card_copy SET location = 'DECK', current_manager_id = NULL
         WHERE id = ? AND season_id = ? AND location = 'HAND' AND current_manager_id = ?`
      ).bind(copy.id, season.id, ctx.auth.manager.id),
      ctx.env.DB.prepare(
        `INSERT INTO card_movement
         (id, season_id, card_copy_id, manager_id, actor_user_id, movement_type, from_location,
          to_location, target_manager_id, target_label, whatsapp_message, distribution_batch_id,
          related_movement_id, notes, created_at)
         SELECT ?, ?, ?, ?, ?, 'DISCARDED', 'HAND', 'DECK', NULL, NULL, NULL, NULL, NULL, NULL, ?
         WHERE changes() = 1`
      ).bind(
        result.movement.id,
        result.movement.seasonId,
        result.movement.cardCopyId,
        result.movement.managerId,
        result.movement.actorUserId,
        result.movement.createdAt
      )
    ]);
    if (changesOf(writeResults[0]) !== 1 || changesOf(writeResults[1]) !== 1) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'La carta ya no está disponible en tu mano.'
      });
    }
    return { card: result.updatedCardCopy, movement: result.movement };
  })
});
