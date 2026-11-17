import { planWeeklyDistribution, type CardCopy } from '@munchinking/domain';
import type { D1Database } from '@cloudflare/workers-types';
import { TRPCError } from '@trpc/server';
import { getActiveSeason, isUniqueConstraintError } from './data';
import { newId, nowIso } from '../utils/ids';

export interface DistributionResult {
  seasonId: string;
  weekKey: string;
  distributed: number;
  skippedFullHandCount: number;
  movements: Array<{
    id: string;
    seasonId: string;
    cardCopyId: string;
    managerId: string;
    actorUserId: string | null;
    movementType: 'DISTRIBUTED';
    fromLocation: 'DECK';
    toLocation: 'HAND';
    distributionBatchId: string;
    createdAt: string;
  }>;
}

export async function executeDistribution(params: {
  db: D1Database;
  leagueId: string;
  seasonId?: string;
  weekKey: string;
  actorUserId: string | null;
  triggerSource: 'ADMIN' | 'CRON';
}): Promise<DistributionResult> {
  const activeSeason = await getActiveSeason(params.db, params.leagueId);
  if (!activeSeason || (params.seasonId && params.seasonId !== activeSeason.id)) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'La temporada indicada no está activa.'
    });
  }

  const existing = await params.db
    .prepare('SELECT id FROM distribution_batch WHERE season_id = ? AND week_key = ? LIMIT 1')
    .bind(activeSeason.id, params.weekKey)
    .first<{ id: string }>();
  if (existing) {
    throw new TRPCError({
      code: 'CONFLICT',
      message: 'El reparto de esta semana ya se ha ejecutado.'
    });
  }

  const [managerRows, deckRows] = await Promise.all([
    params.db
      .prepare(
        `SELECT m.id, m.display_name AS displayName, m.is_active AS isActive,
                COUNT(c.id) AS currentHandCount
         FROM manager m LEFT JOIN card_copy c
           ON c.current_manager_id = m.id AND c.season_id = ? AND c.location = 'HAND'
         WHERE m.league_id = ? AND m.is_active = 1
         GROUP BY m.id`
      )
      .bind(activeSeason.id, params.leagueId)
      .all<{ id: string; displayName: string; isActive: number; currentHandCount: number }>(),
    params.db
      .prepare(
        `SELECT id, season_id AS seasonId, card_definition_id AS cardDefinitionId,
                current_manager_id AS currentManagerId, location, created_at AS createdAt
         FROM card_copy WHERE season_id = ? AND location = 'DECK' AND current_manager_id IS NULL`
      )
      .bind(activeSeason.id)
      .all<CardCopy>()
  ]);

  const batchId = newId();
  const createdAt = nowIso();
  const randomFloat = () => crypto.getRandomValues(new Uint32Array(1))[0]! / 0x1_0000_0000;
  const plan = planWeeklyDistribution({
    season: { id: activeSeason.id, isActive: true },
    alreadyExecutedForWeek: false,
    managers: (managerRows.results ?? []).map((row) => ({
      manager: { id: row.id, displayName: row.displayName, isActive: row.isActive === 1 },
      currentHandCount: row.currentHandCount
    })),
    availableDeckCopies: deckRows.results ?? [],
    distributionBatchId: batchId,
    actorUserId: params.actorUserId,
    nowIso: createdAt,
    randomFloat,
    createUuid: newId
  });

  const statements = [
    params.db
      .prepare(
        `INSERT INTO distribution_batch
         (id, season_id, week_key, trigger_source, triggered_by_user_id, distributed_count,
          skipped_full_hand_count, created_at)
         VALUES (?, ?, ?, ?, ?, 0, ?, ?)`
      )
      .bind(
        batchId,
        activeSeason.id,
        params.weekKey,
        params.triggerSource,
        params.actorUserId,
        plan.skippedFullHandCount,
        createdAt
      )
  ];

  for (const assignment of plan.assignments) {
    statements.push(
      params.db
        .prepare(
          `UPDATE card_copy SET location = 'HAND', current_manager_id = ?
           WHERE id = ? AND season_id = ? AND location = 'DECK' AND current_manager_id IS NULL
             AND (SELECT COUNT(*) FROM card_copy WHERE current_manager_id = ? AND season_id = ? AND location = 'HAND') < 3`
        )
        .bind(
          assignment.managerId,
          assignment.updatedCardCopy.id,
          activeSeason.id,
          assignment.managerId,
          activeSeason.id
        ),
      params.db
        .prepare(
          `INSERT INTO card_movement
           (id, season_id, card_copy_id, manager_id, actor_user_id, movement_type, from_location,
            to_location, target_manager_id, target_label, whatsapp_message, distribution_batch_id,
            related_movement_id, notes, created_at)
           SELECT ?, ?, ?, ?, ?, 'DISTRIBUTED', 'DECK', 'HAND', NULL, NULL, NULL, ?, NULL, NULL, ?
           WHERE changes() = 1`
        )
        .bind(
          assignment.movement.id,
          assignment.movement.seasonId,
          assignment.movement.cardCopyId,
          assignment.movement.managerId,
          assignment.movement.actorUserId,
          batchId,
          assignment.movement.createdAt
        ),
      params.db
        .prepare(
          `INSERT INTO notification
           (id, manager_id, notification_type, title, message, related_movement_id, is_read, read_at, created_at)
           SELECT ?, ?, 'CARD_DISTRIBUTED', ?, ?, ?, 0, NULL, ?
           WHERE EXISTS (SELECT 1 FROM card_movement WHERE id = ? AND distribution_batch_id = ?)`
        )
        .bind(
          assignment.notification.id,
          assignment.notification.managerId,
          assignment.notification.title,
          assignment.notification.message,
          assignment.notification.relatedMovementId,
          assignment.notification.createdAt,
          assignment.movement.id,
          batchId
        )
    );
  }
  statements.push(
    params.db
      .prepare(
        `UPDATE distribution_batch SET
           distributed_count = (SELECT COUNT(*) FROM card_movement WHERE distribution_batch_id = ? AND movement_type = 'DISTRIBUTED')
         WHERE id = ?`
      )
      .bind(batchId, batchId)
  );

  try {
    await params.db.batch(statements);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'El reparto de esta semana ya se ha ejecutado.'
      });
    }
    throw error;
  }

  const persisted = await params.db
    .prepare(
      "SELECT id, season_id AS seasonId, card_copy_id AS cardCopyId, manager_id AS managerId, actor_user_id AS actorUserId, created_at AS createdAt FROM card_movement WHERE distribution_batch_id = ? AND movement_type = 'DISTRIBUTED' ORDER BY created_at, id"
    )
    .bind(batchId)
    .all<DistributionResult['movements'][number]>();

  return {
    seasonId: activeSeason.id,
    weekKey: params.weekKey,
    distributed: persisted.results?.length ?? 0,
    skippedFullHandCount: plan.skippedFullHandCount,
    movements: (persisted.results ?? []).map((movement) => ({
      ...movement,
      movementType: 'DISTRIBUTED',
      fromLocation: 'DECK',
      toLocation: 'HAND',
      distributionBatchId: batchId
    }))
  };
}
