import { isoWeekKeySchema, uuidSchema } from '@munchinking/shared';
import { computeIsoWeekKey } from '@munchinking/domain';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { executeDistribution } from '../services/distribution';
import { getActiveSeason } from '../services/data';
import { adminProcedure, protectedProcedure, router } from '../trpc/trpc';

const statusInput = z.object({ weekKey: isoWeekKeySchema.optional() }).optional();
const executeInput = z
  .object({ seasonId: uuidSchema.optional(), weekKey: isoWeekKeySchema.optional() })
  .optional();

export const distributionRouter = router({
  status: protectedProcedure.input(statusInput).query(async ({ ctx, input }) => {
    const season = await getActiveSeason(ctx.env.DB, ctx.auth.manager.leagueId);
    if (!season) {
      throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'No hay temporada activa.' });
    }
    const weekKey =
      input?.weekKey ?? computeIsoWeekKey(new Date(), ctx.env.APP_TIMEZONE ?? 'Europe/Madrid');
    const [batch, counts] = await Promise.all([
      ctx.env.DB.prepare(
        `SELECT id, season_id AS seasonId, week_key AS weekKey, trigger_source AS triggerSource,
                triggered_by_user_id AS triggeredByUserId, distributed_count AS distributedCount,
                skipped_full_hand_count AS skippedFullHandCount, created_at AS createdAt
         FROM distribution_batch WHERE season_id = ? AND week_key = ? LIMIT 1`
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
          createdAt: string;
        }>(),
      ctx.env.DB.prepare(
        `SELECT
           (SELECT COUNT(*) FROM card_copy WHERE season_id = ? AND location = 'DECK' AND current_manager_id IS NULL) AS availableDeckCopies,
           (SELECT COUNT(*) FROM manager m WHERE m.league_id = ? AND m.is_active = 1 AND
             (SELECT COUNT(*) FROM card_copy c WHERE c.current_manager_id = m.id AND c.season_id = ? AND c.location = 'HAND') < 3) AS eligibleManagersCount`
      )
        .bind(season.id, ctx.auth.manager.leagueId, season.id)
        .first<{ availableDeckCopies: number; eligibleManagersCount: number }>()
    ]);
    return {
      seasonId: season.id,
      weekKey,
      alreadyExecuted: Boolean(batch),
      batch: batch ?? null,
      availableDeckCopies: counts?.availableDeckCopies ?? 0,
      eligibleManagersCount: counts?.eligibleManagersCount ?? 0
    };
  }),

  execute: adminProcedure.input(executeInput).mutation(async ({ ctx, input }) => {
    const weekKey =
      input?.weekKey ?? computeIsoWeekKey(new Date(), ctx.env.APP_TIMEZONE ?? 'Europe/Madrid');
    return executeDistribution({
      db: ctx.env.DB,
      leagueId: ctx.auth.manager.leagueId,
      seasonId: input?.seasonId,
      weekKey,
      actorUserId: ctx.auth.user.id,
      triggerSource: 'ADMIN'
    });
  })
});
