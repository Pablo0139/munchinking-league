import { cursorPaginationInputSchema, uuidSchema } from '@munchinking/shared';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { protectedProcedure, router } from '../trpc/trpc';
import { decodeCursor, encodeCursor } from '../utils/cursor';
import { nowIso } from '../utils/ids';

const notificationsInput = cursorPaginationInputSchema.extend({
  unreadOnly: z.boolean().default(false)
});

export const notificationsRouter = router({
  list: protectedProcedure.input(notificationsInput).query(async ({ ctx, input }) => {
    const cursor = decodeCursor(input.cursor);
    if (input.cursor && !cursor)
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cursor de paginación inválido.' });
    const clauses = ['manager_id = ?'];
    const bindings: (string | number)[] = [ctx.auth.manager.id];
    if (input.unreadOnly) clauses.push('is_read = 0');
    if (cursor) {
      clauses.push('(created_at < ? OR (created_at = ? AND id < ?))');
      bindings.push(cursor.createdAt, cursor.createdAt, cursor.id);
    }
    const result = await ctx.env.DB.prepare(
      `SELECT id, manager_id AS managerId, notification_type AS notificationType,
              title, message, related_movement_id AS relatedMovementId,
              is_read AS isRead, read_at AS readAt, created_at AS createdAt
       FROM notification WHERE ${clauses.join(' AND ')}
       ORDER BY created_at DESC, id DESC LIMIT ?`
    )
      .bind(...bindings, input.limit + 1)
      .all<{
        id: string;
        managerId: string;
        notificationType: string;
        title: string;
        message: string;
        relatedMovementId: string | null;
        isRead: number;
        readAt: string | null;
        createdAt: string;
      }>();
    const rows = result.results ?? [];
    const hasMore = rows.length > input.limit;
    const items = (hasMore ? rows.slice(0, input.limit) : rows).map((row) => ({
      ...row,
      isRead: row.isRead === 1
    }));
    const last = items.at(-1);
    return {
      items,
      nextCursor: hasMore && last ? encodeCursor({ createdAt: last.createdAt, id: last.id }) : null
    };
  }),

  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    const row = await ctx.env.DB.prepare(
      'SELECT COUNT(*) AS count FROM notification WHERE manager_id = ? AND is_read = 0'
    )
      .bind(ctx.auth.manager.id)
      .first<{ count: number }>();
    return { count: row?.count ?? 0 };
  }),

  markAsRead: protectedProcedure
    .input(z.object({ notificationId: uuidSchema }))
    .mutation(async ({ ctx, input }) => {
      const readAt = nowIso();
      const result = await ctx.env.DB.prepare(
        `UPDATE notification SET is_read = 1, read_at = ?
         WHERE id = ? AND manager_id = ? RETURNING id, manager_id AS managerId,
           notification_type AS notificationType, title, message,
           related_movement_id AS relatedMovementId, is_read AS isRead,
           read_at AS readAt, created_at AS createdAt`
      )
        .bind(readAt, input.notificationId, ctx.auth.manager.id)
        .first<{
          id: string;
          managerId: string;
          notificationType: string;
          title: string;
          message: string;
          relatedMovementId: string | null;
          isRead: number;
          readAt: string | null;
          createdAt: string;
        }>();
      if (!result)
        throw new TRPCError({ code: 'NOT_FOUND', message: 'No se encontró la notificación.' });
      return { notification: { ...result, isRead: true } };
    }),

  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    const result = await ctx.env.DB.prepare(
      'UPDATE notification SET is_read = 1, read_at = ? WHERE manager_id = ? AND is_read = 0'
    )
      .bind(nowIso(), ctx.auth.manager.id)
      .run();
    return { updatedCount: result.meta.changes ?? 0 };
  })
});
