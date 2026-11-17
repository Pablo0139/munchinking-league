import { computeIsoWeekKey } from '@munchinking/domain';
import { publicProcedure, router } from '../trpc/trpc';

const healthRouter = router({
  ping: publicProcedure.query(({ ctx }) => ({
    status: 'ok' as const,
    service: 'munchinking-api',
    currentWeekKey: computeIsoWeekKey(new Date(), ctx.env.APP_TIMEZONE ?? 'Europe/Madrid')
  }))
});

export const appRouter = router({
  health: healthRouter
});

export type AppRouter = typeof appRouter;
