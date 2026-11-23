import { randomUUID } from 'node:crypto';
import { beforeAll, beforeEach, expect, it } from 'vitest';
import { musActionPredicate, musAfterMovement } from '../apps/api/src/services/mus';
import { useTestWorker } from './worker-fixture';

const { database, ok, login } = useTestWorker();
let db: Awaited<ReturnType<typeof database>>;
let season: string, a: string, b: string, empty: string, admin: string, rival: string;
const stamp = '2026-11-20T12:00:00Z';
const sql = (query: string, ...args: string[]) => db.prepare(query).bind(...args);

beforeAll(async () => {
  db = await database();
  season = await db.prepare('SELECT id FROM season WHERE is_active = 1').first('id');
  const account = async (name: string) => sql('SELECT m.id FROM manager m JOIN user u ON u.id=m.user_id WHERE u.username=?', name).first('id');
  [a, b, empty, admin, rival] = await Promise.all([account('zacarias'), account('contratodo'), account('admin'), login('admin', 'ADMIN'), login('contratodo')]);
  // Only for the old seed; never replace the official definition when present.
  if (!await db.prepare("SELECT id FROM card_definition WHERE slug='mus'").first()) {
    await sql(`INSERT INTO card_definition (id,slug,name,nickname,description,usage_rules,rarity,target_type,default_copies,image_url,whatsapp_template,created_at)
      VALUES (?,'mus','Mus','','','','EPIC','NONE',1,'','',?)`, randomUUID(), stamp).run();
  }
});

beforeEach(async () => {
  await db.batch([db.prepare('DELETE FROM mus_obligation'), db.prepare("UPDATE card_copy SET location='DECK', current_manager_id=NULL WHERE location='HAND'")]);
});

async function give(owner: string, kind: 'mus' | 'EPIC' | 'RARE' | 'COMMON', s = season) {
  const copy = randomUUID();
  await sql(`INSERT INTO card_copy (id,season_id,card_definition_id,current_manager_id,location,created_at)
    SELECT ?,?,id,?,'HAND',? FROM card_definition WHERE ${kind === 'mus' ? 'slug=?' : "rarity=? AND slug<>'mus'"} LIMIT 1`, copy, s, owner, stamp, kind).run();
  return copy;
}

// Reproduce the router's write contract, not its validation or a second version
// of the Mus rules. This stays executable before the separate router integration.
async function move(owner: string, copy: string, action: 'PLAYED' | 'DISCARDED', id: string = randomUUID(), s = season) {
  const result = await db.batch([
    sql(`UPDATE card_copy SET location='DECK', current_manager_id=NULL WHERE id=? AND season_id=? AND location='HAND'
      AND current_manager_id=? AND ${musActionPredicate(action)}`, copy, s, owner),
    sql(`INSERT INTO card_movement (id,season_id,card_copy_id,manager_id,movement_type,from_location,to_location,created_at)
      SELECT ?,?,?,?,?,'HAND','DECK',? WHERE changes()=1`, id, s, copy, owner, action, stamp),
    musAfterMovement(db, action, id)
  ]);
  return { id, changed: result[0].meta.changes, effects: result[2].meta.changes };
}
const hand = () => ok('manager.getHand', 'GET', rival);

it('toma una instantánea de destinatarios, no de rango; empate, privacidad y aislamiento', async () => {
  const mus = await give(a, 'mus'), own = await give(a, 'COMMON');
  const low = await give(b, 'COMMON'), mid = await give(b, 'RARE');
  const archived = randomUUID();
  await sql("INSERT INTO season (id,league_id,name,created_at) SELECT ?,league_id,'QA',? FROM season WHERE id=?", archived, stamp, season).run();
  const archiveCard = await give(empty, 'RARE', archived);
  const otherLeague = randomUUID();
  await sql("INSERT INTO league (id,name,created_at) VALUES (?,'QA',?)", otherLeague, stamp).run();
  const outsider = await sql('SELECT id FROM manager WHERE id NOT IN (?,?,?) LIMIT 1', a, b, empty).first('id');
  await sql('UPDATE manager SET league_id=? WHERE id=?', otherLeague, outsider).run();
  await give(outsider, 'COMMON'); // Even an inconsistent cross-league hand is excluded.
  expect(await move(a, mus, 'PLAYED')).toMatchObject({ changed: 1, effects: 1 });
  expect(await hand()).toMatchObject({ musDiscardRequired: true });
  expect((await hand()).cards.map((c: { cardCopyId: string }) => c.cardCopyId).sort()).toEqual([low, mid].sort());
  expect((await move(a, own, 'PLAYED')).changed).toBe(1);
  expect((await move(empty, await give(empty, 'COMMON'), 'PLAYED')).changed).toBe(1);
  expect((await move(empty, archiveCard, 'PLAYED', randomUUID(), archived)).changed).toBe(1);
  const high = await give(b, 'EPIC'), tie = await give(b, 'EPIC');
  expect((await move(b, high, 'PLAYED')).changed).toBe(0);
  expect((await move(b, mid, 'DISCARDED')).changed).toBe(0);
  expect((await move(b, tie, 'DISCARDED')).effects).toBe(1);
  expect((await hand()).musDiscardRequired).toBe(false);
  expect((await move(b, high, 'PLAYED')).changed).toBe(1);
});

it('dos Mus en carrera no se saltan el bloqueo; una escritura fallida no consume la obligación', async () => {
  const first = await give(a, 'mus'), second = await give(b, 'mus');
  const results = await Promise.all([move(a, first, 'PLAYED'), move(b, second, 'PLAYED')]);
  expect(results.map(r => r.changed).sort()).toEqual([0, 1]);
  const winner = results[0]!.changed ? results[0]! : results[1]!;
  const [owner, copy] = results[0]!.changed ? [b, second] : [a, first];
  expect(await move(owner, copy, 'PLAYED', winner.id)).toMatchObject({ changed: 0, effects: 0 });
  // Duplicate movement id fails after a valid UPDATE: D1 must roll back the copy too.
  await expect(move(owner, copy, 'DISCARDED', winner.id)).rejects.toThrow();
  expect((await move(owner, copy, 'PLAYED')).changed).toBe(0);
  expect(await move(owner, copy, 'DISCARDED')).toMatchObject({ changed: 1, effects: 1 });
});

it('varios orígenes: devolver uno mantiene el otro; un descarte cubre todos los pendientes', async () => {
  const first = await move(a, await give(a, 'mus'), 'PLAYED'); // no rivals yet
  expect(first.effects).toBe(0);
  const card = await give(b, 'RARE');
  const playMus = async () => move(a, await give(a, 'mus'), 'PLAYED');
  const one = await playMus(), two = await playMus();
  await ok('admin.returnCard', 'POST', admin, { movementId: one.id });
  expect((await move(b, card, 'PLAYED')).changed).toBe(0);
  await ok('admin.returnCard', 'POST', admin, { movementId: two.id });
  expect((await hand()).musDiscardRequired).toBe(false);
  await playMus(); await playMus();
  expect((await move(b, card, 'DISCARDED')).changed).toBe(1);
  expect((await hand()).musDiscardRequired).toBe(false);
});