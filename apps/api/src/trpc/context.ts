import type { D1Database, R2Bucket } from '@cloudflare/workers-types';
import { createDb, type Database } from '@munchinking/db';
import type { Manager, User } from '@munchinking/domain';

export interface WorkerEnv {
  DB: D1Database;
  ASSETS_BUCKET?: R2Bucket;
  SESSION_SECRET?: string;
  APP_ORIGIN?: string;
  APP_TIMEZONE?: string;
}

export interface TrpcContext {
  env: WorkerEnv;
  req: Request;
  resHeaders: Headers;
  db: Database;
  auth: {
    user: User;
    manager: Manager;
    sessionId: string;
  } | null;
}

export function createTrpcContext(params: {
  env: WorkerEnv;
  req: Request;
  resHeaders: Headers;
}): TrpcContext {
  return {
    env: params.env,
    req: params.req,
    resHeaders: params.resHeaders,
    db: createDb(params.env.DB),
    auth: null
  };
}
