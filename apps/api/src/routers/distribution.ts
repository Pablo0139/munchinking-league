import { isoWeekKeySchema, uuidSchema } from '@munchinking/shared';
import { computeIsoWeekKey } from '@munchinking/domain';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { executeDistribution } from '../services/distribution';
import { getActiveSeason } from '../services/data';
import { adminProcedure, router } from '../trpc/trpc';

const statusInput = z.object({ weekKey: isoWeekKeySchema.optional() }).optional();
const snapshotSchema = z.array(z.object({ id: z.string(), displayName: z.string() }));
const executeInput = z
  .object({
    seasonId: uuidSchema.optional(),
    weekKey: isoWeekKeySchema.optional(),
    forceAdditional: z.boolean().optional(),
    expectedWeekBatchCount: z.number().int().nonnegative().optional()
  })
  .optional();

export const distributionRouter = router({
  status: adminProcedure.input(statusInput).query(async ({ ctx, input }) => {
    const season = await getActiveSeason(ctx.env.DB, ctx.auth.manager.leagueId);
    if (!season) {
      throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'No hay temporada activa.' });
    }
    const weekKey =
      input?.weekKey ?? computeIsoWeekKey(new Date(), ctx.env.APP_TIMEZONE ?? 'Europe/Madrid');
    const [batchRow, counts] = await Promise.all([
      ctx.env.DB.prepare(
        `SELECT id, season_id AS seasonId, week_key AS weekKey, trigger_source AS triggerSource,
                triggered_by_user_id AS triggeredByUserId, distributed_count AS distributedCount,
                skipped_full_hand_count AS skippedFullHandCount, created_at AS createdAt,
                skipped_full_hand_managers AS snapshot
         FROM distribution_batch
         WHERE season_id = ? AND week_key = ?
         ORDER BY created_at DESC, id DESC
         LIMIT 1`
      )
        .bind(season.id, weekKey)
        .first<{
          id: string;
          seasonId: string;
          weekKey: string;
          triggerSource: 'ADMIN' | 'CRON';
          triggeredByUserId: string | null;
          distributedCount: number;
          skippedFullHandCount: number;
          snapshot: string | null;
          createdAt: string;
        }>(),
      ctx.env.DB.prepare(
        `SELECT
           (SELECT COUNT(*) FROM distribution_batch WHERE season_id = ? AND week_key = ?) AS weekBatchCount,
           (SELECT COUNT(*) FROM card_copy WHERE season_id = ? AND location = 'DECK' AND current_manager_id IS NULL
             AND card_definition_id IN (SELECT id FROM card_definition WHERE is_enabled = 1)) AS availableDeckCopies,
           (SELECT COUNT(*) FROM manager m WHERE m.league_id = ? AND m.is_active = 1 AND
             (SELECT COUNT(*) FROM card_copy c WHERE c.current_manager_id = m.id AND c.season_id = ? AND c.location = 'HAND') < 3) AS eligibleManagersCount`
      )
        .bind(season.id, weekKey, season.id, ctx.auth.manager.leagueId, season.id)
        .first<{ weekBatchCount: number; availableDeckCopies: number; eligibleManagersCount: number }>()
    ]);
    const splitBatch = (row: NonNullable<typeof batchRow>) => {
      const { snapshot, ...batch } = row;
      return {
        batch,
        skippedFullHandManagers: snapshot === null ? null : snapshotSchema.parse(JSON.parse(snapshot))
      };
    };
    const weekBatchCount = counts?.weekBatchCount ?? (batchRow ? 1 : 0);
    return {
      seasonId: season.id,
      weekKey,
      alreadyExecuted: weekBatchCount > 0,
      weekBatchCount,
      ...(batchRow ? splitBatch(batchRow) : { batch: null, skippedFullHandManagers: null }),
      availableDeckCopies: counts?.availableDeckCopies ?? 0,
      eligibleManagersCount: counts?.eligibleManagersCount ?? 0
    };
  }),

  execute: adminProcedure.input(executeInput).mutation(async ({ ctx, input }) => {
    const weekKey = computeIsoWeekKey(new Date(), ctx.env.APP_TIMEZONE ?? 'Europe/Madrid');
    if (input?.weekKey !== undefined && input.weekKey !== weekKey) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'La semana indicada no es la actual. Actualiza el estado del reparto antes de confirmar.'
      });
    }
    return executeDistribution({
      db: ctx.env.DB,
      leagueId: ctx.auth.manager.leagueId,
      seasonId: input?.seasonId,
      weekKey,
      actorUserId: ctx.auth.user.id,
      triggerSource: 'ADMIN',
      allowAdditionalForWeek: input?.forceAdditional === true,
      expectedWeekBatchCount: input?.expectedWeekBatchCount
    });
  })
});
