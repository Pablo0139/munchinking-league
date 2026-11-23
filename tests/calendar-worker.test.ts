import { expect, it } from 'vitest';
import { validateScheduledWindow } from '../apps/api/src/services/season-calendar';
import { useTestWorker } from './worker-fixture';

const { rpc, ok, database, login } = useTestWorker();
it('autoriza, aísla ligas y actualiza sin duplicar ni pisar revisiones', async () => {
  const admin = await login('admin', 'ADMIN'), manager = await login('zacarias');
  expect((await rpc('calendar.list','GET')).response.status).toBe(401);
  expect((await rpc('calendar.list','GET',manager)).response.status).toBe(403);
  const list = () => ok('calendar.list','GET',admin);
  const { seasonId, rounds, zone } = await list();
  expect(rounds).toEqual([]); expect(zone).toBe('Europe/Madrid');
  const db = await database();
  await db.batch([db.prepare("INSERT INTO league (id,name,created_at) VALUES ('other','test','')"),
    db.prepare("INSERT INTO season (id,league_id,name,is_active,created_at) VALUES ('other','other','test',1,'')")]);
  const input = { seasonId, roundNumber: 1, expectedRevision: 0, firstStart:'2020-07-01T10:00', lastStart:'2020-07-01T10:00', endAt:'2020-07-01T12:00', endKind:'planned' };
  const status = async (delta: object, cookie = admin) => (await rpc('calendar.save','POST',cookie,{ ...input, ...delta })).response.status;
  expect(await status({}, manager)).toBe(403);
  expect(await status({ seasonId: 'other' })).toBe(409);
  for (const invalid of [{ roundNumber: 0 }, { roundNumber: 0.5 }, { firstStart:'2020-07-01T10:01' }, { endAt:input.lastStart }, { endAt:'2020-02-31T12:00' }, { endKind:'actual',endAt:'2099-01-01T12:00' }]) expect(await status(invalid)).toBe(400);
  expect(await status({})).toBe(200);
  expect(await status({})).toBe(409);
  expect(await status({ expectedRevision:1,endKind:'actual' })).toBe(200);
  expect(await status({ expectedRevision:1 })).toBe(409);
  const revised = (await list()).rounds;
  expect(revised).toHaveLength(1);
  expect(revised[0]).toMatchObject({ firstStart:'2020-07-01T08:00:00.000Z', endKind:'actual', revision:2 });
  expect((await validateScheduledWindow(db, seasonId,'cambio-de-puntuacion','2020-07-01T10:00:00Z')).status).toBe('open');
  expect((await validateScheduledWindow(db, 'other','cambio-de-puntuacion','2020-07-01T10:00:00Z')).status).toBe('external');
});