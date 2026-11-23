import { expect, it } from 'vitest';
import { unstable_splitSqlQuery as splitSql } from 'wrangler';
import { buildCatalogUpgradeSql } from '../db/seed/upgrade-catalog';
import { INITIAL_CARD_CATALOG_SEED as official } from '../db/seed/cards.seed';
import { useTestWorker } from './worker-fixture';

const { database, login, ok } = useTestWorker({ legacyCatalog: true });

it('preserva lotes, avisos, movimientos y manos; no vuelve a repartir cartas retiradas', async () => {
  const db = await database();
  const admin = await login('admin', 'ADMIN');
  const deal = (n: number) => ok('distribution.execute', 'POST', admin, { forceAdditional: true, expectedWeekBatchCount: n });
  const upgrade = () => db.batch(splitSql(buildCatalogUpgradeSql()).map(sql => db.prepare(sql)));
  const rows = async (sql: string) => (await db.prepare(sql).all()).results;
  const snapshot = () => Promise.all(['distribution_batch','card_movement','notification','manager','user'].map(t => rows(`SELECT * FROM ${t} ORDER BY id`)));
  const hand = () => rows("SELECT * FROM card_copy WHERE location='HAND' ORDER BY id");
  expect((await deal(0)).distributed).toBe(9);
  const before = await snapshot();
  const held = await hand();
  const legacyCopies = () => rows('SELECT c.* FROM card_copy c JOIN card_definition d ON c.card_definition_id=d.id WHERE d.is_enabled=0 ORDER BY c.id');
  const originalCopies = await rows('SELECT * FROM card_copy ORDER BY id');
  await upgrade();
  expect(await snapshot()).toEqual(before);
  expect(await hand()).toEqual(held);
  expect(await legacyCopies()).toEqual(originalCopies);
  const library = (await ok('library.list','GET',admin)).cards;
  expect(library.map((c: { slug: string }) => c.slug).sort()).toEqual(official.map(c => c.slug).sort());
  const total = official.reduce((sum, c) => sum + c.defaultCopies, 0);
  const available = async () => (await ok('distribution.status','GET',admin)).availableDeckCopies;
  expect(await available()).toBe(total);
  expect((await deal(1)).distributed).toBe(9);
  expect(await available()).toBe(total - 9);
  expect(await legacyCopies()).toEqual(originalCopies);
  const after = await snapshot();
  const copies = await rows('SELECT * FROM card_copy ORDER BY id');
  await upgrade();
  expect(await snapshot()).toEqual(after);
  expect(await rows('SELECT * FROM card_copy ORDER BY id')).toEqual(copies);
  // Solo quedan demos disponibles: ni se cuentan ni se mueven aunque haya manos elegibles.
  await db.prepare('UPDATE card_definition SET is_enabled=0').run();
  expect(await available()).toBe(0);
  expect((await deal(2)).distributed).toBe(0);
  expect(await legacyCopies()).toEqual(copies);
}, 30_000);