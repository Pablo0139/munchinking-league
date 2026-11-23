import { planWeeklyDistribution, type CardCopy } from '@munchinking/domain';
import { MAX_HAND_SIZE } from '@munchinking/shared';
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
  allowAdditionalForWeek?: boolean;
  expectedWeekBatchCount?: number;
}): Promise<DistributionResult> {
  const activeSeason = await getActiveSeason(params.db, params.leagueId);
  if (!activeSeason || (params.seasonId && params.seasonId !== activeSeason.id)) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'La temporada indicada no está activa.'
    });
  }

  const requireUnreadWeek =
    params.triggerSource === 'CRON' || !params.allowAdditionalForWeek;
  if (requireUnreadWeek || params.expectedWeekBatchCount !== undefined) {
    const existingCount = await params.db
      .prepare('SELECT COUNT(*) AS count FROM distribution_batch WHERE season_id = ? AND week_key = ?')
      .bind(activeSeason.id, params.weekKey)
      .first<{ count: number }>();
    const currentWeekBatches = existingCount?.count ?? 0;
    if (requireUnreadWeek && currentWeekBatches > 0) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'El reparto de esta semana ya se ha ejecutado.'
      });
    }
    if (
      params.expectedWeekBatchCount !== undefined &&
      currentWeekBatches !== params.expectedWeekBatchCount
    ) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'El número de lotes de la semana ha cambiado. Actualiza el estado antes de confirmar.'
      });
    }
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
         FROM card_copy WHERE season_id = ? AND location = 'DECK' AND current_manager_id IS NULL
           AND card_definition_id IN (SELECT id FROM card_definition WHERE is_enabled = 1)`
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

  const expectedBatchCount =
    params.expectedWeekBatchCount !== undefined ? params.expectedWeekBatchCount : -1;
  const statements = [
    params.db
      .prepare(
        `INSERT INTO distribution_batch
         (id, season_id, week_key, trigger_source, triggered_by_user_id, distributed_count,
          skipped_full_hand_count, skipped_full_hand_managers, created_at)
         SELECT ?, ?, ?, ?, ?, 0, full_hands.cnt, full_hands.managers_json, ?
         FROM (
           SELECT COUNT(*) AS cnt,
                  json_group_array(json_object('id', id, 'displayName', display_name)) AS managers_json
           FROM (
             SELECT m.id, m.display_name FROM manager m
             JOIN card_copy c ON c.current_manager_id = m.id AND c.season_id = ? AND c.location = 'HAND'
             WHERE m.league_id = ? AND m.is_active = 1
             GROUP BY m.id HAVING COUNT(*) >= ? ORDER BY m.id
           )
         ) AS full_hands
         WHERE (? = 1 OR NOT EXISTS (
           SELECT 1 FROM distribution_batch WHERE season_id = ? AND week_key = ?
         ))
         AND (? < 0 OR (
           SELECT COUNT(*) FROM distribution_batch WHERE season_id = ? AND week_key = ?
         ) = ?)
         RETURNING skipped_full_hand_count AS skippedFullHandCount`
      )
      .bind(
        batchId,
        activeSeason.id,
        params.weekKey,
        params.triggerSource,
        params.actorUserId,
        createdAt,
        activeSeason.id,
        params.leagueId,
        MAX_HAND_SIZE,
        requireUnreadWeek ? 0 : 1,
        activeSeason.id,
        params.weekKey,
        expectedBatchCount,
        activeSeason.id,
        params.weekKey,
        expectedBatchCount
      )
  ];

  for (const assignment of plan.assignments) {
    statements.push(
      params.db
        .prepare(
          `UPDATE card_copy SET location = 'HAND', current_manager_id = ?
           WHERE id = ? AND season_id = ? AND location = 'DECK' AND current_manager_id IS NULL
             AND card_definition_id IN (SELECT id FROM card_definition WHERE is_enabled = 1)
             AND EXISTS (SELECT 1 FROM distribution_batch WHERE id = ?)
             AND (SELECT COUNT(*) FROM card_copy WHERE current_manager_id = ? AND season_id = ? AND location = 'HAND') < 3`
        )
        .bind(
          assignment.managerId,
          assignment.updatedCardCopy.id,
          activeSeason.id,
          batchId,
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

  let skippedFullHandCount: number;
  try {
    const [inserted] = await params.db.batch<{ skippedFullHandCount: number }>(statements);
    const firstRow = inserted?.results?.[0];
    if (!firstRow) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'El reparto de esta semana ya se ha ejecutado.'
      });
    }
    skippedFullHandCount = firstRow.skippedFullHandCount;
  } catch (error) {
    if (error instanceof TRPCError) {
      throw error;
    }
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
    skippedFullHandCount,
    movements: (persisted.results ?? []).map((movement) => ({
      ...movement,
      movementType: 'DISTRIBUTED',
      fromLocation: 'DECK',
      toLocation: 'HAND',
      distributionBatchId: batchId
    }))
  };
}
