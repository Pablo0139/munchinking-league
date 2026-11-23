import { describe, expect, it } from 'vitest';
import { INITIAL_CARD_CATALOG_SEED } from '../db/seed/cards.seed';
import { buildDevSeedSql } from '../db/seed/dev.seed';
import { buildCatalogUpgradeSql } from '../db/seed/upgrade-catalog';
import { LEGACY_TEST_CATALOG } from './fixtures/legacy-catalog';
import { SEASON_CARDS } from '../packages/shared/src/season-cards';

describe('DB Seed — Canonical Card Catalog & Dev Seed Generator', () => {
  it('derives 33 distinct definitions from the official catalog, without demo slugs', () => {
    expect(INITIAL_CARD_CATALOG_SEED).toHaveLength(33);

    const slugs = new Set(INITIAL_CARD_CATALOG_SEED.map((card) => card.slug));
    expect(slugs.size).toBe(33);
    for (const card of SEASON_CARDS) {
      expect(INITIAL_CARD_CATALOG_SEED).toContainEqual(expect.objectContaining({
        slug: card.slug, name: card.name, nickname: card.nickname, usageRules: card.usageRules,
        description: card.description, rarity: card.rarity, targetType: 'NONE',
        imageUrl: '/icons/league-192.png', defaultCopies: {COMMON: 3, RARE: 2, EPIC: 1}[card.rarity]
      }));
    }
    expect(LEGACY_TEST_CATALOG.some(c => slugs.has(c.slug))).toBe(false);
  });

  it('builds deterministic fresh SQL with 9 accounts, only official cards and a separate credential-free upgrade', () => {
    const first = buildDevSeedSql();
    const second = buildDevSeedSql();

    expect(first.totalManagers).toBe(9);
    expect(first.totalCopies).toBe(SEASON_CARDS.reduce((sum,c) => sum + {COMMON: 3, RARE: 2, EPIC: 1}[c.rarity], 0));
    expect(first.sql).toBe(second.sql);
    expect(first.sql).toContain('INSERT OR IGNORE INTO league');
    expect(first.sql).toContain("'DECK'");
    for (const demo of LEGACY_TEST_CATALOG) expect(first.sql).not.toContain(`'${demo.slug}'`);
    expect(buildCatalogUpgradeSql()).toBe(buildCatalogUpgradeSql());
    expect(buildCatalogUpgradeSql()).not.toMatch(/password|pbkdf2|INSERT INTO (user|manager)|\bDELETE\b/i);
  });
});
