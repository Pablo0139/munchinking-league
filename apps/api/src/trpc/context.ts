import type { D1Database, R2Bucket } from '@cloudflare/workers-types';
import { createDb, type Database } from '@munchinking/db';
import type { Manager, User } from '@munchinking/domain';
import type { UserRole } from '@munchinking/shared';
import { sha256Hex } from '../security/password';

export const SESSION_COOKIE_NAME = 'munchinking_session';

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

function readCookie(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0 || part.slice(0, separator).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return null;
    }
  }
  return null;
}

export async function createTrpcContext(params: {
  env: WorkerEnv;
  req: Request;
  resHeaders: Headers;
}): Promise<TrpcContext> {
  const db = createDb(params.env.DB);
  const token = readCookie(params.req, SESSION_COOKIE_NAME);
  let auth: TrpcContext['auth'] = null;

  if (token && token.length <= 256) {
    const tokenHash = await sha256Hex(token);
    const now = new Date().toISOString();
    const row = await params.env.DB.prepare(
      `SELECT s.id AS sessionId, u.id AS userId, u.username, u.role, u.is_active AS userActive,
              u.created_at AS userCreatedAt, u.updated_at AS userUpdatedAt,
              m.id AS managerId, m.user_id AS managerUserId, m.league_id AS leagueId,
              m.display_name AS displayName, m.team_name AS teamName, m.avatar_url AS avatarUrl,
              m.is_active AS managerActive, m.created_at AS managerCreatedAt
       FROM session s
       INNER JOIN user u ON u.id = s.user_id
       INNER JOIN manager m ON m.user_id = u.id
       WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > ?
       LIMIT 1`
    )
      .bind(tokenHash, now)
      .first<{
        sessionId: string;
        userId: string;
        username: string;
        role: string;
        userActive: number;
        userCreatedAt: string;
        userUpdatedAt: string;
        managerId: string;
        managerUserId: string;
        leagueId: string;
        displayName: string;
        teamName: string | null;
        avatarUrl: string | null;
        managerActive: number;
        managerCreatedAt: string;
      }>();

    if (row && row.userActive === 1 && row.managerActive === 1) {
      auth = {
        sessionId: row.sessionId,
        user: {
          id: row.userId,
          username: row.username,
          role: row.role as UserRole,
          isActive: true,
          createdAt: row.userCreatedAt,
          updatedAt: row.userUpdatedAt
        },
        manager: {
          id: row.managerId,
          userId: row.managerUserId,
          leagueId: row.leagueId,
          displayName: row.displayName,
          teamName: row.teamName,
          avatarUrl: row.avatarUrl,
          isActive: true,
          createdAt: row.managerCreatedAt
        }
      };
    }
  }

  return {
    env: params.env,
    req: params.req,
    resHeaders: params.resHeaders,
    db,
    auth
  };
}
