import { createHash } from 'node:crypto';
import type { CardDefinitionSeed } from '@munchinking/shared';

export function deterministicUuid(seedKey: string): string {
  const hex = createHash('sha256').update(`munchinking:${seedKey}`).digest('hex');
  return [hex.slice(0, 8), hex.slice(8, 12), `4${hex.slice(13, 16)}`, `8${hex.slice(17, 20)}`, hex.slice(20, 32)].join('-');
}

export function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

export const leagueId = deterministicUuid('league:munchinking');
export const seasonId = deterministicUuid('season:2026-2027');
export const knownSeason = `EXISTS (SELECT 1 FROM season WHERE id = '${seasonId}' AND league_id = '${leagueId}')`;
const created = '2026-11-17T08:00:00.000Z';

export function catalogStatements(catalog: readonly CardDefinitionSeed[]): string[] {
  const statements: string[] = [];
  for (const card of catalog) {
    const id = deterministicUuid(`card_definition:${card.slug}`);
    const columns = ['slug','name','nickname','description','usage_rules','rarity','target_type','default_copies','image_url','whatsapp_template'];
    const values = [card.slug, card.name, card.nickname, card.description, card.usageRules, card.rarity, card.targetType, String(card.defaultCopies), card.imageUrl, card.whatsappTemplate].map(sqlString);
    statements.push(`INSERT INTO card_definition (id, ${columns.join(', ')}, is_enabled, created_at)
      SELECT '${id}', ${values.join(', ')}, 1, '${created}' WHERE ${knownSeason}
      ON CONFLICT(id) DO UPDATE SET ${columns.slice(1).map(c => `${c} = excluded.${c}`).join(', ')}
      WHERE card_definition.slug = excluded.slug AND NOT EXISTS (SELECT 1 FROM card_copy WHERE card_definition_id = excluded.id AND season_id <> '${seasonId}');`);
    for (let n = 1; n <= card.defaultCopies; n++) {
      const copy = deterministicUuid(`card_copy:${seasonId}:${card.slug}:${n}`);
      statements.push(`INSERT INTO card_copy (id, season_id, card_definition_id, current_manager_id, location, created_at)
        SELECT '${copy}', '${seasonId}', '${id}', NULL, 'DECK', '${created}' WHERE ${knownSeason}
        ON CONFLICT(id) DO NOTHING;`);
    }
  }
  return statements;
}