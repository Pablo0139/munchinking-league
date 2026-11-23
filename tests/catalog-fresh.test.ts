import { expect, it } from 'vitest';
import { unstable_splitSqlQuery as splitSql } from 'wrangler';
import { useTestWorker } from './worker-fixture';
import { buildCatalogUpgradeSql } from '../db/seed/upgrade-catalog';

const { database } = useTestWorker();

it('el seed limpio crea 33 definiciones y 71 copias; el upgrade no afecta a otra temporada', async () => {
  const db = await database();
  expect(await db.prepare('SELECT COUNT(*) FROM card_definition').first('COUNT(*)')).toBe(33);
  expect(await db.prepare("SELECT COUNT(*) FROM card_copy WHERE location='DECK'").first('COUNT(*)')).toBe(71);
  const initial = await db.prepare('SELECT * FROM card_copy ORDER BY id').all();
  // Archiva la temporada de la instalación bajo otro ID (las copias siguen a esa temporada).
  await db.batch([
    db.prepare("INSERT INTO season (id, league_id, name, created_at) SELECT 'other', league_id, 'Archivo', created_at FROM season"),
    db.prepare("UPDATE card_copy SET season_id='other'"),
    db.prepare("DELETE FROM season WHERE id <> 'other'"),
    db.prepare("UPDATE card_definition SET name='Nombre archivado'")
  ]);
  await db.batch(splitSql(buildCatalogUpgradeSql()).map(sql => db.prepare(sql)));
  expect(await db.prepare('SELECT * FROM card_copy ORDER BY id').all().then((r: typeof initial) => r.results))
    .toEqual(initial.results.map((c: object) => ({...c, season_id: 'other'})));
  expect(await db.prepare("SELECT COUNT(*) AS n FROM card_definition WHERE name='Nombre archivado'").first('n')).toBe(33);
});