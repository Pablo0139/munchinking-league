import { describe, expect, it } from 'vitest';
import { INITIAL_CARD_CATALOG_SEED } from '../db/seed/cards.seed';
import { buildDevSeedSql } from '../db/seed/dev.seed';

describe('DB Seed — Canonical Card Catalog & Dev Seed Generator', () => {
  it('defines 13 unique card definitions totaling 40 copies across rarities', () => {
    expect(INITIAL_CARD_CATALOG_SEED).toHaveLength(13);

    const slugs = new Set(INITIAL_CARD_CATALOG_SEED.map((card) => card.slug));
    expect(slugs.size).toBe(13);

    const totalCopies = INITIAL_CARD_CATALOG_SEED.reduce(
      (sum, card) => sum + card.defaultCopies,
      0
    );
    expect(totalCopies).toBe(40);
  });

  it('builds deterministic idempotent SQL seed with 9 accounts and 40 deck copies', () => {
    const first = buildDevSeedSql();
    const second = buildDevSeedSql();

    expect(first.totalManagers).toBe(9);
    expect(first.totalCopies).toBe(40);
    expect(first.sql).toBe(second.sql);
    expect(first.sql).toContain('INSERT OR IGNORE INTO league');
    expect(first.sql).toContain("'DECK'");
  });
});
