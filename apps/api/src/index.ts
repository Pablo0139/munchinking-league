import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { computeIsoWeekKey } from '@munchinking/domain';
import { appRouter } from './routers/index';
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
    const weekKey = computeIsoWeekKey(
      new Date(controller.scheduledTime),
      env.APP_TIMEZONE ?? 'Europe/Madrid'
    );
    console.info(`[scheduled] Weekly distribution trigger received for ${weekKey}`);
  }
};
