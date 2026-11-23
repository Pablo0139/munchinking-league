import { beforeAll, beforeEach, expect, it } from 'vitest';
import { useTestWorker } from './worker-fixture';

const { database, login, rpc, ok } = useTestWorker();
type Choices = Record<string, string>;
type Manager = { cookie: string; id: string; displayName: string };
let sender: Manager, target: Manager, third: Manager, admin: string;

async function manager(username: string): Promise<Manager> {
  const cookie = await login(username);
  return { ...(await ok('auth.me', 'GET', cookie)).manager, cookie };
}
beforeAll(async () => {
  [sender, target, third, admin] = await Promise.all([
    manager('zacarias'), manager('contratodo'), manager('goldito'), login('admin', 'ADMIN')
  ]);
});

beforeEach(async () => {
  const db = await database();
  await db.batch([
    'DELETE FROM notification', 'DELETE FROM mus_obligation', 'DELETE FROM card_play_effect',
    'DELETE FROM card_movement WHERE related_movement_id IS NOT NULL', 'DELETE FROM card_movement',
    'DELETE FROM distribution_batch', 'DELETE FROM season_round_calendar',
    "UPDATE card_copy SET location='DECK', current_manager_id=NULL"
  ].map(sql => db.prepare(sql)));
});

async function deal(owner: Manager, slug: string): Promise<string> {
  const db = await database();
  const copy = await db.prepare(`UPDATE card_copy SET location='HAND', current_manager_id=? WHERE id=(
    SELECT c.id FROM card_copy c JOIN card_definition d ON c.card_definition_id=d.id
    WHERE d.slug=? AND c.location='DECK' ORDER BY c.id LIMIT 1) RETURNING id`).bind(owner.id, slug).first();
  expect(copy, `Falta copia de ${slug}`).not.toBeNull();
  return copy.id;
}
const payload = (cardCopyId: string, choices: Choices = {}) => ({ cardCopyId, rulesConfirmed: true, choices });
const play = (m: Manager, id: string, choices: Choices = {}) => ok('cards.play', 'POST', m.cookie, payload(id, choices));
const options = async (m: Manager) => (await ok('cards.mirrorTargets', 'GET', m.cookie)).items;
const effect = async (id: string) => (await database()).prepare('SELECT * FROM card_play_effect WHERE movement_id=?').bind(id).first();

// Compare all gameplay writes, including unrelated hands and the source of a rejected reflection.
async function state() {
  const db = await database();
  return (await db.batch(['card_copy', 'card_movement', 'card_play_effect', 'mus_obligation', 'notification']
    .map(table => db.prepare(`SELECT * FROM ${table} ORDER BY rowid`)))).map((r: { results: unknown[] }) => r.results);
}
async function rejects(m: Manager, input: object, path = 'cards.play') {
  const before = await state();
  const { response, body } = await rpc(path, 'POST', m.cookie, input);
  expect([400, 403, 404, 409, 412], JSON.stringify(body)).toContain(response.status);
  expect(body.error.data.path).toBe(path);
  expect(await state()).toEqual(before);
}

it('rechaza confirmación, selecciones y tipos inválidos sin consumir la carta', async () => {
  const id = await deal(sender, 'capitan-obligatorio');
  const valid = payload(id, { rival: target.id, player: 'Luis' });
  for (const input of [{ cardCopyId: id }, { cardCopyId: id, choices: valid.choices },
    { ...valid, rulesConfirmed: false }, { cardCopyId: id, rulesConfirmed: true },
    payload(id, { rival: target.id }), { ...valid, choices: { rival: target.id, player: 42 } },
    payload(id, { ...valid.choices, surprise: 'x' })]) await rejects(sender, input);
});

it('rechaza un rival real y activo de otra liga', async () => {
  const db = await database();
  const id = await deal(sender, 'capitan-obligatorio');
  const foreign = 'cd5d054a-e269-437f-8084-73a5c53702e7';
  const local = await db.prepare('SELECT league_id FROM manager WHERE id=?').bind(third.id).first('league_id');
  await db.batch([db.prepare("INSERT INTO league(id,name,created_at) VALUES (?,'Visitante','2026-01-01')").bind(foreign),
    db.prepare('UPDATE manager SET league_id=? WHERE id=?').bind(foreign, third.id)]);
  try { await rejects(sender, payload(id, { rival: third.id, player: 'Luis' })); }
  finally {
    await db.batch([db.prepare('UPDATE manager SET league_id=? WHERE id=?').bind(local, third.id),
      db.prepare('DELETE FROM league WHERE id=?').bind(foreign)]);
  }
});

it('dos jugadas simultáneas de Cheque publican un único D6 y el mismo importe persistido', async () => {
  const id = await deal(sender, 'cheque-misterioso');
  const submit = () => rpc('cards.play', 'POST', sender.cookie, payload(id));
  const pair = await Promise.all([submit(), submit()]);
  expect(pair.map(r => r.response.status).sort()).toEqual([200, 409]);
  const winner = pair.find(r => r.response.status === 200)!.body.result.data;
  const e = await effect(winner.movement.id);
  expect(e).toMatchObject({ effective_slug: 'cheque-misterioso', mirror_source_id: null });
  const face = /D6:\s*([1-6])\b/i.exec(e.summary)?.[1];
  expect(face).toBeDefined();
  expect(e.summary).toContain(`${face}.000.000`);
  expect(winner.whatsappMessage).toContain(e.summary);
  const db = await database();
  expect(await db.prepare('SELECT count(*) FROM card_play_effect').first('count(*)')).toBe(1);
  expect(await db.prepare('SELECT location,current_manager_id FROM card_copy WHERE id=?').bind(id).first())
    .toEqual({ location: 'DECK', current_manager_id: null });
  expect((await ok('history.public', 'GET', target.cookie, {})).items).toEqual([expect.objectContaining({
    id: winner.movement.id, cardCopyId: id, whatsappMessage: winner.whatsappMessage
  })]);
});

it('Mus obliga a descartar la épica antes de poder jugar la rara', async () => {
  const mus = await deal(sender, 'mus');
  const common = await deal(target, 'capitan-obligatorio'), rare = await deal(target, 'cheque-misterioso');
  const epic = await deal(target, 'cambio-de-puntuacion');
  await play(sender, mus);
  await rejects(target, payload(rare));
  for (const cardCopyId of [common, rare]) await rejects(target, { cardCopyId }, 'cards.discard');
  expect((await ok('cards.discard', 'POST', target.cookie, { cardCopyId: epic })).movement)
    .toMatchObject({ movementType: 'DISCARDED', cardCopyId: epic });
  expect((await play(target, rare)).movement).toMatchObject({ movementType: 'PLAYED', cardCopyId: rare });
});

async function round(first: string, last: string, end: string) {
  await (await database()).prepare(`INSERT INTO season_round_calendar
    (season_id,round_number,first_start,last_start,end_at,end_kind)
    SELECT id,1,?,?,?,'planned' FROM season WHERE is_active=1`).bind(first, last, end).run();
}
it('la confirmación externa no abre la ventana de una jornada parametrizada', async () => {
  const id = await deal(sender, 'capitan-obligatorio');
  await round('2099-01-02T12:00:00.000Z', '2099-01-03T12:00:00.000Z', '2099-01-03T15:00:00.000Z');
  const choices = { rival: target.id, player: 'Luis' };
  await rejects(sender, payload(id, choices));
  await (await database()).prepare('DELETE FROM season_round_calendar').run();
  await play(sender, id, choices); // Identical request is externally confirmable only without the calendar.
});

it.each(['blindaje-de-cartas', 'prohibido-capitan-y-ariete'])('%s bloquea Capitán Obligatorio solo mientras la protección sigue activa', async slug => {
  // Historical pre-kickoff activation; the Worker clock lies inside this fixed synthetic round.
  const db = await database(), source = await deal(target, slug), id = await deal(sender, 'capitan-obligatorio');
  await round('2001-01-02T12:00:00.000Z', '2099-01-03T12:00:00.000Z', '2099-01-03T15:00:00.000Z');
  const movement = 'ea623bd7-ef07-43ed-a133-63be22c837ec';
  await db.batch([
    db.prepare("UPDATE card_copy SET location='DECK',current_manager_id=NULL WHERE id=?").bind(source),
    db.prepare(`INSERT INTO card_movement(id,season_id,card_copy_id,manager_id,movement_type,from_location,to_location,created_at)
      SELECT ?,season_id,id,?,'PLAYED','HAND','DECK','2001-01-01T12:00:00.000Z' FROM card_copy WHERE id=?`).bind(movement, target.id, source),
    db.prepare(`INSERT INTO card_play_effect(movement_id,choices_json,summary,round_number,effective_slug,effective_choices_json)
      VALUES (?,'{}','Activación histórica',1,?,'{}')`).bind(movement, slug)
  ]);
  const choices = { rival: target.id, player: 'Luis' };
  await rejects(sender, payload(id, choices));
  await ok('admin.returnCard', 'POST', admin, { movementId: movement });
  await play(sender, id, choices);
});

it.each([
  ['intercambio-puntuacion-jugador', 'Intercambio puntuación de jugador', false],
  ['capitan-obligatorio', 'Capitán Obligatorio', true]
] as const)('Espejo lista y refleja una jugada real de %s solo contra su emisor', async (slug, cardName, requiresPlayer) => {
  const source = await deal(sender, slug), mirror = await deal(target, 'carta-espejo');
  const original: Choices = { rival: target.id };
  if (requiresPlayer) original.player = 'Luis';
  const { movement } = await play(sender, source, original);
  expect(movement.targetManagerId).toBe(target.id);
  expect(await options(target)).toEqual([expect.objectContaining({ id: movement.id, cardName,
    managerName: sender.displayName, targetLabel: movement.targetLabel, createdAt: movement.createdAt, requiresPlayer })]);
  const choices: Choices = { movement: movement.id };
  const effective: Choices = { rival: sender.id };
  if (requiresPlayer) {
    await rejects(target, payload(mirror, choices));
    choices.reflectedPlayer = 'Pau'; effective.player = 'Pau';
  }
  const reflected = await play(target, mirror, choices);
  expect(reflected.movement.targetManagerId).toBe(sender.id);
  const row = await effect(reflected.movement.id);
  expect(row).toMatchObject({ mirror_source_id: movement.id, effective_slug: slug });
  expect(JSON.parse(row.choices_json)).toEqual(choices);
  expect(JSON.parse(row.effective_choices_json)).toEqual(effective);
  expect(JSON.parse((await effect(movement.id)).choices_json)).toEqual(original);
});

it.each(['otro destinatario', 'devuelta', 'cambio-de-puntuacion'])('Espejo excluye y rechaza fuente: %s', async reason => {
  const change = reason === 'cambio-de-puntuacion';
  const source = await deal(sender, change ? reason : 'intercambio-puntuacion-jugador');
  const mirror = await deal(target, 'carta-espejo');
  const { movement } = await play(sender, source, change ? { first: sender.id, second: target.id }
    : { rival: reason === 'otro destinatario' ? third.id : target.id });
  if (reason === 'devuelta') await ok('admin.returnCard', 'POST', admin, { movementId: movement.id });
  expect(await options(target)).toEqual([]);
  await rejects(target, payload(mirror, { movement: movement.id }));
});