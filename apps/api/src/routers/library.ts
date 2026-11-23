import type { CardDefinition } from '@munchinking/domain';
import { cardRaritySchema } from '@munchinking/shared';
import { z } from 'zod';
import { getActiveSeason } from '../services/data';
import { protectedProcedure, router } from '../trpc/trpc';

type LibraryCard = Omit<CardDefinition, 'isEnabled'> & { isEnabled: number; seasonCopiesCount: number };

export const libraryRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          rarity: cardRaritySchema.optional(),
          search: z.string().trim().max(100).optional()
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const season = await getActiveSeason(ctx.env.DB, ctx.auth.manager.leagueId);
      const clauses = ['d.is_enabled = 1'];
      const bindings: (string | number)[] = [];
      if (input?.rarity) {
        clauses.push('d.rarity = ?');
        bindings.push(input.rarity);
      }
      if (input?.search) {
        const search = `%${input.search.replace(/[\\%_]/g, '\\$&')}%`;
        clauses.push(
          "(d.name LIKE ? ESCAPE '\\' OR d.nickname LIKE ? ESCAPE '\\' OR d.description LIKE ? ESCAPE '\\')"
        );
        bindings.push(search, search, search);
      }
      const result = await ctx.env.DB.prepare(
        `SELECT d.id, d.slug, d.name, d.nickname, d.description, d.usage_rules AS usageRules,
                d.rarity, d.target_type AS targetType, d.default_copies AS defaultCopies,
                d.image_url AS imageUrl, d.whatsapp_template AS whatsappTemplate,
                d.is_enabled AS isEnabled, d.created_at AS createdAt,
                COUNT(c.id) AS seasonCopiesCount
         FROM card_definition d
         JOIN card_copy c ON c.card_definition_id = d.id AND c.season_id = ?
         WHERE ${clauses.join(' AND ')}
         GROUP BY d.id
         ORDER BY CASE d.rarity WHEN 'LEGENDARY' THEN 1 WHEN 'EPIC' THEN 2 WHEN 'RARE' THEN 3 ELSE 4 END, d.name COLLATE NOCASE`
      )
        .bind(season?.id ?? '', ...bindings)
        .all<LibraryCard>();
      return { cards: result.results ?? [] };
    })
});
