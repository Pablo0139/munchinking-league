import { MAX_HAND_SIZE } from '@munchinking/shared';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { getActiveSeason } from '../services/data';
import { musStatusStatement } from '../services/mus';
import { protectedProcedure, router } from '../trpc/trpc';

export const managerRouter = router({
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const season = await getActiveSeason(ctx.env.DB, ctx.auth.manager.leagueId);
    const managerId = ctx.auth.manager.id;
    const stats = season
      ? await ctx.env.DB.prepare(
          `SELECT
             SUM(CASE WHEN movement_type = 'PLAYED' THEN 1 ELSE 0 END) AS playedCount,
             SUM(CASE WHEN movement_type = 'DISCARDED' THEN 1 ELSE 0 END) AS discardedCount,
             SUM(CASE WHEN movement_type = 'RETURNED' THEN 1 ELSE 0 END) AS returnedCount
           FROM card_movement WHERE season_id = ? AND manager_id = ?`
        )
          .bind(season.id, managerId)
          .first<{
            playedCount: number | null;
            discardedCount: number | null;
            returnedCount: number | null;
          }>()
      : null;
    const hand = season
      ? await ctx.env.DB.prepare(
          `SELECT COUNT(*) AS handCount FROM card_copy
           WHERE season_id = ? AND current_manager_id = ? AND location = 'HAND'`
        )
          .bind(season.id, managerId)
          .first<{ handCount: number }>()
      : null;

    return {
      ...ctx.auth.manager,
      role: ctx.auth.user.role,
      stats: {
        handCount: hand?.handCount ?? 0,
        playedCount: stats?.playedCount ?? 0,
        discardedCount: stats?.discardedCount ?? 0,
        returnedCount: stats?.returnedCount ?? 0,
        maxHandSize: MAX_HAND_SIZE
      }
    };
  }),

  getHand: protectedProcedure.query(async ({ ctx }) => {
    const season = await getActiveSeason(ctx.env.DB, ctx.auth.manager.leagueId);
    if (!season) return { cards: [], musDiscardRequired: false };
    const handQuery = ctx.env.DB.prepare(
      `SELECT c.id AS cardCopyId, c.created_at AS obtainedAt,
              d.id AS definitionId, d.slug, d.name, d.nickname, d.description,
              d.usage_rules AS usageRules, d.rarity, d.target_type AS targetType,
              d.image_url AS imageUrl, d.whatsapp_template AS whatsappTemplate
       FROM card_copy c INNER JOIN card_definition d ON d.id = c.card_definition_id
       WHERE c.season_id = ? AND c.current_manager_id = ? AND c.location = 'HAND'
       ORDER BY c.created_at DESC, c.id DESC`
    )
      .bind(season.id, ctx.auth.manager.id);
    const [hand, status] = await ctx.env.DB.batch([
      handQuery, musStatusStatement(ctx.env.DB, ctx.auth.manager.id, season.id)
    ]);
    const rows = hand!.results as Array<{
        cardCopyId: string;
        obtainedAt: string;
        definitionId: string;
        slug: string;
        name: string;
        nickname: string;
        description: string;
        usageRules: string;
        rarity: string;
        targetType: string;
        imageUrl: string;
        whatsappTemplate: string;
      }>;
    return {
      musDiscardRequired: (status!.results[0] as { required: number }).required === 1,
      cards: rows.map((row) => ({
        cardCopyId: row.cardCopyId,
        obtainedAt: row.obtainedAt,
        definition: {
          id: row.definitionId,
          slug: row.slug,
          name: row.name,
          nickname: row.nickname,
          description: row.description,
          usageRules: row.usageRules,
          rarity: row.rarity,
          targetType: row.targetType,
          imageUrl: row.imageUrl,
          whatsappTemplate: row.whatsappTemplate
        }
      }))
    };
  }),

  listTargets: protectedProcedure
    .input(z.object({ excludeSelf: z.boolean().default(true) }).default({ excludeSelf: true }))
    .query(async ({ ctx, input }) => {
      const statement = input.excludeSelf
        ? ctx.env.DB.prepare(
            `SELECT id, display_name AS displayName, team_name AS teamName, avatar_url AS avatarUrl
             FROM manager WHERE league_id = ? AND is_active = 1 AND id <> ? ORDER BY display_name COLLATE NOCASE`
          ).bind(ctx.auth.manager.leagueId, ctx.auth.manager.id)
        : ctx.env.DB.prepare(
            `SELECT id, display_name AS displayName, team_name AS teamName, avatar_url AS avatarUrl
             FROM manager WHERE league_id = ? AND is_active = 1 ORDER BY display_name COLLATE NOCASE`
          ).bind(ctx.auth.manager.leagueId);
      const result = await statement.all<{
        id: string;
        displayName: string;
        teamName: string | null;
        avatarUrl: string | null;
      }>();
      if (!result.success) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      return { managers: result.results ?? [] };
    })
});
