import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { computeIsoWeekKey } from '@munchinking/domain';
import { appRouter } from './routers/index';
import { executeDistribution } from './services/distribution';
import { createTrpcContext, type WorkerEnv } from './trpc/context';

function buildCorsHeaders(req: Request, env: WorkerEnv): Headers {
  const allowedOrigin = env.APP_ORIGIN ?? 'http://localhost:5173';
  const requestOrigin = req.headers.get('Origin');
  const headers = new Headers();

  if (requestOrigin === allowedOrigin) {
    headers.set('Access-Control-Allow-Origin', allowedOrigin);
    headers.set('Access-Control-Allow-Credentials', 'true');
    headers.set('Vary', 'Origin');
  }

  headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return headers;
}

export default {
  async fetch(req: Request, env: WorkerEnv): Promise<Response> {
    const corsHeaders = buildCorsHeaders(req, env);

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(req.url);

    if (url.pathname.startsWith('/trpc')) {
      const response = await fetchRequestHandler({
        endpoint: '/trpc',
        req,
        router: appRouter,
        createContext: ({ resHeaders }) => createTrpcContext({ env, req, resHeaders })
      });

      const mergedHeaders = new Headers(response.headers);
      corsHeaders.forEach((value, key) => mergedHeaders.set(key, value));

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: mergedHeaders
      });
    }

    if (url.pathname === '/health') {
      return Response.json(
        {
          status: 'ok',
          weekKey: computeIsoWeekKey(new Date(), env.APP_TIMEZONE ?? 'Europe/Madrid')
        },
        { headers: corsHeaders }
      );
    }

    return Response.json({ error: 'Not Found' }, { status: 404, headers: corsHeaders });
  },

  async scheduled(controller: ScheduledController, env: WorkerEnv): Promise<void> {
    const scheduledAt = new Date(controller.scheduledTime);
    const weekKey = computeIsoWeekKey(scheduledAt, env.APP_TIMEZONE ?? 'Europe/Madrid');
    const activeLeague = await env.DB.prepare(
      `SELECT l.id AS leagueId FROM league l
       INNER JOIN season s ON s.league_id = l.id
       WHERE s.is_active = 1 ORDER BY l.created_at LIMIT 1`
    ).first<{ leagueId: string }>();

    if (!activeLeague) {
      console.warn('[scheduled] No active league/season; distribution skipped.');
      return;
    }

    try {
      const result = await executeDistribution({
        db: env.DB,
        leagueId: activeLeague.leagueId,
        weekKey,
        actorUserId: null,
        triggerSource: 'CRON'
      });
      console.info(`[scheduled] Distributed ${result.distributed} cards for ${weekKey}.`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('ya se ha ejecutado')) {
        console.info(`[scheduled] Distribution for ${weekKey} was already completed.`);
        return;
      }
      console.error(`[scheduled] Distribution failed for ${weekKey}.`, error);
      throw error;
    }
  }
};
