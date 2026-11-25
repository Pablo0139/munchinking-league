import type { CardDefinition, Notification } from '@munchinking/domain';
import { cursorPaginationInputSchema, uuidSchema } from '@munchinking/shared';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { protectedProcedure, router } from '../trpc/trpc';
import { decodeCursor, encodeCursor } from '../utils/cursor';
import { nowIso } from '../utils/ids';

type NotificationRow = Omit<Notification, 'isRead'> & { isRead: number };
type NoticeCard = Pick<CardDefinition, 'slug' | 'name' | 'nickname' | 'description' | 'usageRules' | 'rarity' | 'targetType' | 'imageUrl'>;
type JoinedCard = NoticeCard | { [K in keyof NoticeCard]: null };

const notificationsInput = cursorPaginationInputSchema.extend({
  unreadOnly: z.boolean().default(false)
});

export const notificationsRouter = router({
  list: protectedProcedure.input(notificationsInput).query(async ({ ctx, input }) => {
    const cursor = decodeCursor(input.cursor);
    if (input.cursor && !cursor)
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cursor de paginación inválido.' });
    const clauses = ['n.manager_id = ?'];
    const bindings: (string | number)[] = [ctx.auth.manager.id];
    if (input.unreadOnly) clauses.push('n.is_read = 0');
    if (cursor) {
      clauses.push('(n.created_at < ? OR (n.created_at = ? AND n.id < ?))');
      bindings.push(cursor.createdAt, cursor.createdAt, cursor.id);
    }
    const result = await ctx.env.DB.prepare(
      `SELECT n.id, n.manager_id AS managerId, n.notification_type AS notificationType,
              n.title, n.message, n.related_movement_id AS relatedMovementId,
              n.is_read AS isRead, n.read_at AS readAt, n.created_at AS createdAt,
              d.slug, d.name, d.nickname, d.description, d.usage_rules AS usageRules,
              d.rarity, d.target_type AS targetType, d.image_url AS imageUrl
       FROM notification n
       LEFT JOIN card_movement m ON n.notification_type = 'CARD_DISTRIBUTED'
         AND m.id = n.related_movement_id AND m.manager_id = n.manager_id AND m.movement_type = 'DISTRIBUTED'
       LEFT JOIN card_copy c ON c.id = m.card_copy_id
       LEFT JOIN card_definition d ON d.id = c.card_definition_id
       WHERE ${clauses.join(' AND ')}
       ORDER BY n.created_at DESC, n.id DESC LIMIT ?`
    )
      .bind(...bindings, input.limit + 1)
      .all<NotificationRow & JoinedCard>();
    const rows = result.results ?? [];
    const hasMore = rows.length > input.limit;
    const items = rows.slice(0, input.limit).map((row): Notification & { card: NoticeCard | null } => {
      const { id, managerId, notificationType, title, message, relatedMovementId, isRead, readAt, createdAt } = row;
      const { slug, name, nickname, description, usageRules, rarity, targetType, imageUrl } = row;
      return {
        id, managerId, notificationType, title, message, relatedMovementId, isRead: isRead === 1, readAt, createdAt,
        card: name === null ? null : { slug, name, nickname, description, usageRules, rarity, targetType, imageUrl }
      };
    });
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
        `UPDATE notification SET is_read = 1, read_at = COALESCE(read_at, ?)
         WHERE id = ? AND manager_id = ? RETURNING id, manager_id AS managerId,
           notification_type AS notificationType, title, message,
           related_movement_id AS relatedMovementId, is_read AS isRead,
           read_at AS readAt, created_at AS createdAt`
      )
        .bind(readAt, input.notificationId, ctx.auth.manager.id)
        .first<NotificationRow>();
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
