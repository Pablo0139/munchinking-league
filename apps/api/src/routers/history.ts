import type { D1Database } from '@cloudflare/workers-types';
import { cursorPaginationInputSchema, movementTypeSchema } from '@munchinking/shared';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { getActiveSeason } from '../services/data';
import { decodeCursor, encodeCursor } from '../utils/cursor';
import { protectedProcedure, router } from '../trpc/trpc';

const historyType = movementTypeSchema.optional();
const historyRowSchema = z.object({
  limit: cursorPaginationInputSchema.shape.limit,
  cursor: cursorPaginationInputSchema.shape.cursor,
  movementType: historyType
});

async function getHistoryPage(params: {
  db: D1Database;
  seasonId: string;
  limit: number;
  cursor?: string;
  managerId?: string;
  movementType?: string;
  publicOnly?: boolean;
}) {
  const cursor = decodeCursor(params.cursor);
  if (params.cursor && !cursor)
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cursor de paginación inválido.' });
  const clauses = ['m.season_id = ?'];
  const bindings: (string | number)[] = [params.seasonId];
  if (params.publicOnly) {
    clauses.push("m.movement_type = 'PLAYED'");
    clauses.push(
      "NOT EXISTS (SELECT 1 FROM card_movement r WHERE r.related_movement_id = m.id AND r.movement_type = 'RETURNED')"
    );
  }
  if (params.managerId) {
    clauses.push('m.manager_id = ?');
    bindings.push(params.managerId);
  }
  if (params.movementType) {
    clauses.push('m.movement_type = ?');
    bindings.push(params.movementType);
  }
  if (cursor) {
    clauses.push('(m.created_at < ? OR (m.created_at = ? AND m.id < ?))');
    bindings.push(cursor.createdAt, cursor.createdAt, cursor.id);
  }
  const query = `SELECT m.id, m.season_id AS seasonId, m.card_copy_id AS cardCopyId,
      m.manager_id AS managerId, mg.display_name AS managerName, mg.team_name AS teamName,
      m.actor_user_id AS actorUserId, m.movement_type AS movementType,
      m.from_location AS fromLocation, m.to_location AS toLocation,
      m.target_manager_id AS targetManagerId, target.display_name AS targetManagerName,
      m.target_label AS targetLabel, m.whatsapp_message AS whatsappMessage,
      m.distribution_batch_id AS distributionBatchId, m.related_movement_id AS relatedMovementId,
      m.notes, m.created_at AS createdAt, d.id AS definitionId, d.slug, d.name AS cardName,
      d.nickname AS cardNickname, d.rarity, d.target_type AS targetType, d.image_url AS imageUrl
    FROM card_movement m
    INNER JOIN manager mg ON mg.id = m.manager_id
    INNER JOIN card_copy c ON c.id = m.card_copy_id
    INNER JOIN card_definition d ON d.id = c.card_definition_id
    LEFT JOIN manager target ON target.id = m.target_manager_id
    WHERE ${clauses.join(' AND ')}
    ORDER BY m.created_at DESC, m.id DESC LIMIT ?`;
  const result = await params.db
    .prepare(query)
    .bind(...bindings, params.limit + 1)
    .all<Record<string, unknown> & { id: string; createdAt: string }>();
  const rows = result.results ?? [];
  const hasMore = rows.length > params.limit;
  const items = hasMore ? rows.slice(0, params.limit) : rows;
  const last = items.at(-1);
  return {
    items,
    nextCursor: hasMore && last ? encodeCursor({ createdAt: last.createdAt, id: last.id }) : null
  };
}

export const historyRouter = router({
  public: protectedProcedure.input(cursorPaginationInputSchema).query(async ({ ctx, input }) => {
    const season = await getActiveSeason(ctx.env.DB, ctx.auth.manager.leagueId);
    if (!season) return { items: [], nextCursor: null };
    return getHistoryPage({
      db: ctx.env.DB,
      seasonId: season.id,
      limit: input.limit,
      cursor: input.cursor,
      publicOnly: true
    });
  }),
  mine: protectedProcedure.input(historyRowSchema).query(async ({ ctx, input }) => {
    const season = await getActiveSeason(ctx.env.DB, ctx.auth.manager.leagueId);
    if (!season) return { items: [], nextCursor: null };
    return getHistoryPage({
      db: ctx.env.DB,
      seasonId: season.id,
      limit: input.limit,
      cursor: input.cursor,
      managerId: ctx.auth.manager.id,
      movementType: input.movementType
    });
  })
});

export { getHistoryPage };
