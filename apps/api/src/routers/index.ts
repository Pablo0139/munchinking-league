import { computeIsoWeekKey } from '@munchinking/domain';
import { publicProcedure, router } from '../trpc/trpc';
import { authRouter } from './auth';
import { adminRouter } from './admin';
import { cardsRouter } from './cards';
import { distributionRouter } from './distribution';
import { historyRouter } from './history';
import { libraryRouter } from './library';
import { managerRouter } from './manager';
import { notificationsRouter } from './notifications';

const healthRouter = router({
  ping: publicProcedure.query(({ ctx }) => ({
    status: 'ok' as const,
    service: 'munchinking-api',
    currentWeekKey: computeIsoWeekKey(new Date(), ctx.env.APP_TIMEZONE ?? 'Europe/Madrid')
  }))
});

export const appRouter = router({
  health: healthRouter,
  auth: authRouter,
  manager: managerRouter,
  cards: cardsRouter,
  history: historyRouter,
  library: libraryRouter,
  notifications: notificationsRouter,
  distribution: distributionRouter,
  admin: adminRouter
});

export type AppRouter = typeof appRouter;
