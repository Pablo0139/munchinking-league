import { loginInputSchema } from '@munchinking/shared';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { createSessionToken, sha256Hex, verifyPassword } from '../security/password';
import { SESSION_COOKIE_NAME } from '../trpc/context';
import { protectedProcedure, publicProcedure, router } from '../trpc/trpc';
import { newId, nowIso } from '../utils/ids';

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;
const LOGIN_ERROR = 'Usuario o contraseña incorrectos.';

function sessionCookie(token: string, request: Request, maxAge: number): string {
  const secure = new URL(request.url).protocol === 'https:';
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
}

export const authRouter = router({
  login: publicProcedure.input(loginInputSchema).mutation(async ({ ctx, input }) => {
    const username = input.username.toLocaleLowerCase('es-ES');
    const user = await ctx.env.DB.prepare(
      `SELECT id, username, password_hash AS passwordHash, role, is_active AS isActive,
              created_at AS createdAt, updated_at AS updatedAt
       FROM user WHERE username = ? LIMIT 1`
    )
      .bind(username)
      .first<{
        id: string;
        username: string;
        passwordHash: string;
        role: 'MANAGER' | 'ADMIN';
        isActive: number;
        createdAt: string;
        updatedAt: string;
      }>();

    const validPassword = await verifyPassword(input.password, user?.passwordHash ?? 'invalid');
    if (!user || !validPassword || user.isActive !== 1) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: LOGIN_ERROR });
    }

    const manager = await ctx.env.DB.prepare(
      `SELECT id, user_id AS userId, league_id AS leagueId, display_name AS displayName,
              team_name AS teamName, avatar_url AS avatarUrl, is_active AS isActive,
              created_at AS createdAt
       FROM manager WHERE user_id = ? AND is_active = 1 LIMIT 1`
    )
      .bind(user.id)
      .first<{
        id: string;
        userId: string;
        leagueId: string;
        displayName: string;
        teamName: string | null;
        avatarUrl: string | null;
        isActive: number;
        createdAt: string;
      }>();

    if (!manager) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: LOGIN_ERROR });
    }

    const token = createSessionToken();
    const createdAt = nowIso();
    const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString();
    await ctx.env.DB.prepare(
      `INSERT INTO session (id, user_id, token_hash, expires_at, revoked_at, created_at)
       VALUES (?, ?, ?, ?, NULL, ?)`
    )
      .bind(newId(), user.id, await sha256Hex(token), expiresAt, createdAt)
      .run();

    ctx.resHeaders.append('Set-Cookie', sessionCookie(token, ctx.req, SESSION_TTL_SECONDS));
    return {
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        isActive: true,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      manager: {
        id: manager.id,
        userId: manager.userId,
        leagueId: manager.leagueId,
        displayName: manager.displayName,
        teamName: manager.teamName,
        avatarUrl: manager.avatarUrl,
        isActive: true,
        createdAt: manager.createdAt
      },
      session: { expiresAt, createdAt }
    };
  }),

  logout: publicProcedure.mutation(async ({ ctx }) => {
    if (ctx.auth) {
      await ctx.env.DB.prepare(
        'UPDATE session SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL'
      )
        .bind(nowIso(), ctx.auth.sessionId)
        .run();
    }
    ctx.resHeaders.append('Set-Cookie', sessionCookie('', ctx.req, 0));
    return { success: true };
  }),

  me: protectedProcedure
    .input(z.void().optional())
    .query(({ ctx }) => ({ user: ctx.auth.user, manager: ctx.auth.manager }))
});
