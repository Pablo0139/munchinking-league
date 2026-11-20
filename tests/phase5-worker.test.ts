import { beforeAll, beforeEach, expect, it } from 'vitest';
import { computeIsoWeekKey } from '../packages/domain/src';
import { useTestWorker } from './worker-fixture';

const { database, login, rpc, ok, scheduled } = useTestWorker();
let admin: string, actor: string, rival: string, managerId: string, rivalId: string, adminId: string;
const stmt = async (sql: string, ...args: (string | number)[]) => {
  const query = (await database()).prepare(sql);
  return args.length ? query.bind(...args) : query;
};
const run = async (sql: string, ...args: (string | number)[]) => (await stmt(sql, ...args)).run();
const rows = async (sql: string, ...args: (string | number)[]) => (await (await stmt(sql, ...args)).all()).results;
const history = (input = {}) => ok('admin.history', 'GET', admin, input);
const notices = async (cookie: string) => (await ok('notifications.list', 'GET', cookie, { limit: 50 })).items;
const hand = async () => (await ok('manager.getHand', 'GET', actor)).cards;
const ids = (items: { id: string }[]) => items.map(item => item.id);
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

beforeAll(async () => {
  [admin, actor, rival] = await Promise.all([login('admin', 'ADMIN'), login('zacarias'), login('contratodo')]);
  adminId = (await ok('auth.me', 'GET', admin)).user.id;
  managerId = (await ok('auth.me', 'GET', actor)).manager.id;
  rivalId = (await ok('auth.me', 'GET', rival)).manager.id;
});

beforeEach(async () => {
  const db = await database();
  await db.batch(['DELETE FROM notification', 'DELETE FROM card_movement WHERE related_movement_id IS NOT NULL',
    'DELETE FROM card_movement', 'DELETE FROM distribution_batch',
    "UPDATE card_copy SET location='DECK', current_manager_id=NULL", 'UPDATE manager SET is_active=1',
    "UPDATE manager SET display_name='Bar Zacarías' WHERE id=?"].map(sql =>
    sql.includes('?') ? db.prepare(sql).bind(managerId) : db.prepare(sql)));
});

async function deal(count: number, slug?: string) {
  const sql = `UPDATE card_copy SET location='HAND', current_manager_id=? WHERE id IN
    (SELECT c.id FROM card_copy c JOIN card_definition d ON d.id=c.card_definition_id
     WHERE c.location='DECK' ${slug ? 'AND d.slug=?' : ''} ORDER BY c.id LIMIT ?)`;
  expect((await run(sql, managerId, ...(slug ? [slug] : []), count)).meta.changes).toBe(count);
}

function error(result: Awaited<ReturnType<typeof rpc>>, status: number, code: string) {
  expect(result.response.status).toBe(status);
  expect(result.body.error.data.code).toBe(code);
}

function singleWinner(pair: Awaited<ReturnType<typeof rpc>>[]) {
  expect(pair.map(r => r.response.status).sort()).toEqual([200, 409]);
  error(pair.find(r => r.response.status === 409)!, 409, 'CONFLICT');
  return pair.find(r => r.response.status === 200)!.body.result.data;
}

it('deniega todos los procedimientos administrativos antes de ejecutarlos', async () => {
  const routes: [string, 'GET' | 'POST', object?][] = [
    ['admin.roster', 'GET'], ['admin.history', 'GET', {}], ['admin.returnCard', 'POST', { movementId: uuid(1) }],
    ['admin.sendNotice', 'POST', { title: 'Liga', message: 'Mensaje de prueba' }],
    ['distribution.status', 'GET', {}], ['distribution.execute', 'POST', {}]
  ];
  for (const [path, method, input] of routes) {
    error(await rpc(path, method, actor, input), 403, 'FORBIDDEN');
    error(await rpc(path, method, '', input), 401, 'UNAUTHORIZED');
  }
});

it('roster incluye activos e inactivos y cuenta solo cartas en mano', async () => {
  await deal(2);
  await run('UPDATE manager SET is_active=0 WHERE id=?', rivalId);
  const roster = (await ok('admin.roster', 'GET', admin)).managers;
  const expected = await rows('SELECT id, display_name AS displayName FROM manager ORDER BY display_name COLLATE NOCASE, id');
  expect(roster).toEqual(expected.map((m: { id: string }) => ({ ...m, isActive: m.id !== rivalId, handCount: m.id === managerId ? 2 : 0 })));
});

it('audita todos los tipos y combina filtros y cursor estable con fechas empatadas', async () => {
  const types = ['DISTRIBUTED', 'PLAYED', 'RETURNED', 'DISCARDED', 'PLAYED', 'PLAYED'];
  for (const [i, type] of types.entries()) {
    const toHand = ['DISTRIBUTED', 'RETURNED'].includes(type);
    await run(`INSERT INTO card_movement (id, season_id, card_copy_id, manager_id, movement_type,
      from_location, to_location, related_movement_id, created_at) SELECT ?, season_id, id, ?, ?, ?, ?, NULLIF(?, ''),
      '2026-01-05T07:00:00Z' FROM card_copy ORDER BY id LIMIT 1`, uuid(i), i === 4 ? rivalId : managerId,
      type, toHand ? 'DECK' : 'HAND', toHand ? 'HAND' : 'DECK', i === 2 ? uuid(1) : '');
  }
  expect(ids((await history()).items)).toEqual([5, 4, 3, 2, 1, 0].map(uuid));
  expect(ids((await history({ managerId: rivalId })).items)).toEqual([uuid(4)]);
  for (const movementType of new Set(types)) {
    expect(ids((await history({ movementType })).items)).toEqual(types.flatMap((t, i) => t === movementType ? [uuid(i)] : []).reverse());
  }
  const filters = { managerId, movementType: 'PLAYED', limit: 1 };
  const first = await history(filters);
  expect(ids(first.items)).toEqual([uuid(5)]);
  expect(first.nextCursor).toEqual(expect.any(String));
  const last = await history({ ...filters, cursor: first.nextCursor });
  expect(ids(last.items)).toEqual([uuid(1)]);
  expect(last.nextCursor).toBeNull();
});

it('dos jugadas normales sobre la misma copia producen una única jugada pública', async () => {
  await deal(1, 'presi-culo');
  const [{ cardCopyId }] = await hand();
  const play = () => rpc('cards.play', 'POST', actor, { cardCopyId, targetManagerId: rivalId });
  const { movement } = singleWinner(await Promise.all([play(), play()]));
  expect(await hand()).toEqual([]);
  expect(await rows('SELECT location, current_manager_id FROM card_copy WHERE id=?', cardCopyId))
    .toEqual([{ location: 'DECK', current_manager_id: null }]);
  expect(ids((await history()).items)).toEqual([movement.id]);
  expect(ids((await ok('history.public', 'GET', rival, {})).items)).toEqual([movement.id]);
});

it('bloquea la devolución con mano llena; dos reintentos solo restituyen una carta y un aviso con motivo', async () => {
  await deal(1, 'presi-culo');
  const [{ cardCopyId }] = await hand();
  const played = await ok('cards.play', 'POST', actor, { cardCopyId, targetManagerId: rivalId });
  const movementId = played.movement.id;
  const reason = 'Objetivo incorrecto';
  const restore = () => rpc('admin.returnCard', 'POST', admin, { movementId, reason });
  await deal(3, 'prima-por-objetivo');
  const full = await restore();
  error(full, 409, 'CONFLICT');
  expect(full.body.error.data.appCode).toBe('HAND_LIMIT_REACHED');
  expect(full.body.error.message).toMatch(/mano llena/i);
  expect(await notices(actor)).toEqual([]);
  expect(ids((await history()).items)).toEqual([movementId]);
  const discard = await ok('cards.discard', 'POST', actor, { cardCopyId: (await hand())[0].cardCopyId });
  error(await rpc('admin.returnCard', 'POST', admin, { movementId: discard.movement.id }), 400, 'BAD_REQUEST');
  const result = singleWinner(await Promise.all([restore(), restore()]));
  error(await restore(), 409, 'CONFLICT');
  const cards = await hand();
  expect(cards).toHaveLength(3);
  expect(cards).toContainEqual(expect.objectContaining({ cardCopyId }));
  const audit = (await history()).items;
  expect(audit).toHaveLength(3);
  expect(audit).toContainEqual(expect.objectContaining({ id: movementId, movementType: 'PLAYED', isReturned: true }));
  expect(audit).toContainEqual(expect.objectContaining({ id: result.movement.id, relatedMovementId: movementId,
    movementType: 'RETURNED', managerId, actorUserId: adminId, notes: reason, cardCopyId }));
  expect(await notices(actor)).toEqual([expect.objectContaining({ notificationType: 'CARD_RETURNED',
    relatedMovementId: result.movement.id, message: expect.stringContaining(reason), isRead: false })]);
  expect(await notices(rival)).toEqual([]);
});

it('envía avisos individuales privados y una copia del global por manager activo', async () => {
  await run("UPDATE manager SET is_active=0 WHERE user_id=(SELECT id FROM user WHERE username='goldito')");
  const active = ids(await rows('SELECT id FROM manager WHERE is_active=1 ORDER BY id'));
  const send = (input: object) => ok('admin.sendNotice', 'POST', admin, { message: 'Aviso de la liga', ...input });
  expect(await send({ targetManagerId: managerId, title: 'Privado' })).toEqual({ deliveredCount: 1 });
  expect(await send({ title: 'Global' })).toEqual({ deliveredCount: active.length });
  const deliveries = (title: string) => rows(`SELECT manager_id AS id FROM notification
    WHERE title=? AND notification_type='ADMIN_NOTICE' ORDER BY manager_id`, title);
  expect(ids(await deliveries('Privado'))).toEqual([managerId]);
  expect(ids(await deliveries('Global'))).toEqual(active);
  expect((await notices(actor)).map((n: { title: string }) => n.title).sort()).toEqual(['Global', 'Privado']);
  expect(await notices(rival)).toEqual([expect.objectContaining({ title: 'Global', isRead: false })]);
});

// Inspect the persisted side effects, not just the counters returned by execute/status.
async function verifyDeal(eligible: string[], batchId: string) {
  const assignments = await rows(`SELECT m.manager_id AS id, c.current_manager_id AS owner, n.manager_id AS recipient,
    m.distribution_batch_id AS batchId FROM card_movement m JOIN card_copy c ON c.id=m.card_copy_id
    LEFT JOIN notification n ON n.related_movement_id=m.id AND n.notification_type='CARD_DISTRIBUTED'
    WHERE c.location='HAND' AND m.movement_type='DISTRIBUTED' ORDER BY m.manager_id`);
  expect(assignments).toEqual(eligible.map(id => ({ id, owner: id, recipient: id, batchId })));
  expect(await rows('SELECT id FROM distribution_batch')).toEqual([{ id: batchId }]);
}

it('reparto manual concurrente e idempotente: excluye mano llena y conserva su nombre histórico', async () => {
  await deal(3);
  const weekKey = computeIsoWeekKey(new Date(), 'Europe/Madrid');
  const status = () => ok('distribution.status', 'GET', admin, { weekKey });
  const before = await status();
  const eligible = ids(await rows('SELECT id FROM manager WHERE is_active=1 AND id<>? ORDER BY id', managerId));
  expect(before).toMatchObject({ weekKey, alreadyExecuted: false, batch: null, eligibleManagersCount: eligible.length });
  const execute = () => rpc('distribution.execute', 'POST', admin, { weekKey, seasonId: before.seasonId });
  const result = singleWinner(await Promise.all([execute(), execute()]));
  expect(result).toMatchObject({ distributed: eligible.length, weekKey, skippedFullHandCount: 1 });
  error(await execute(), 409, 'CONFLICT');
  const after = await status();
  expect(after).toMatchObject({ alreadyExecuted: true, availableDeckCopies: before.availableDeckCopies - eligible.length,
    batch: { weekKey, triggerSource: 'ADMIN', triggeredByUserId: adminId, distributedCount: eligible.length, skippedFullHandCount: 1 },
    skippedFullHandManagers: [{ id: managerId, displayName: 'Bar Zacarías' }] });
  expect(await hand()).toHaveLength(3);
  await verifyDeal(eligible, after.batch.id);
  await run('UPDATE manager SET display_name=? WHERE id=?', 'Nuevo nombre', managerId);
  await ok('cards.discard', 'POST', actor, { cardCopyId: (await hand())[0].cardCopyId });
  expect(await status()).toMatchObject({ batch: after.batch, skippedFullHandManagers: after.skippedFullHandManagers });
});

it('scheduled usa la semana de scheduledTime y tolera una segunda entrega del mismo evento', async () => {
  const time = Date.parse('2026-01-05T07:00:00Z');
  const weekKey = '2026-W02';
  const status = () => ok('distribution.status', 'GET', admin, { weekKey });
  const eligible = ids(await rows('SELECT id FROM manager WHERE is_active=1 ORDER BY id'));
  expect(await status()).toMatchObject({ alreadyExecuted: false });
  await scheduled(time);
  const first = await status();
  expect(first).toMatchObject({ alreadyExecuted: true, skippedFullHandManagers: [],
    batch: { weekKey, triggerSource: 'CRON', triggeredByUserId: null, distributedCount: eligible.length, skippedFullHandCount: 0 } });
  await scheduled(time);
  expect(await status()).toEqual(first);
  await verifyDeal(eligible, first.batch.id);
});

it('permite repartos manuales adicionales en la misma semana con forceAdditional y expectedWeekBatchCount, sin duplicar en concurrencia ni en CRON posterior', async () => {
  const weekKey = computeIsoWeekKey(new Date(), 'Europe/Madrid');
  const status = () => ok('distribution.status', 'GET', admin, { weekKey });
  const initial = await status();
  expect(initial).toMatchObject({ weekKey, alreadyExecuted: false, weekBatchCount: 0, batch: null });

  const firstRun = await ok('distribution.execute', 'POST', admin, {
    weekKey,
    seasonId: initial.seasonId,
    expectedWeekBatchCount: 0
  });
  expect(firstRun.distributed).toBe(initial.eligibleManagersCount);

  const afterFirst = await status();
  expect(afterFirst).toMatchObject({ alreadyExecuted: true, weekBatchCount: 1 });

  // Sin forceAdditional sigue bloqueado por defecto.
  error(await rpc('distribution.execute', 'POST', admin, { weekKey, seasonId: initial.seasonId }), 409, 'CONFLICT');

  // Con forceAdditional y expectedWeekBatchCount=1, dos clics concurrentes solo ejecutan un segundo lote.
  const forceSecond = () =>
    rpc('distribution.execute', 'POST', admin, {
      weekKey,
      seasonId: initial.seasonId,
      forceAdditional: true,
      expectedWeekBatchCount: 1
    });
  const secondRun = singleWinner(await Promise.all([forceSecond(), forceSecond()]));
  expect(secondRun.distributed).toBe(afterFirst.eligibleManagersCount);

  const afterSecond = await status();
  expect(afterSecond).toMatchObject({
    alreadyExecuted: true,
    weekBatchCount: 2,
    batch: { weekKey, triggerSource: 'ADMIN', triggeredByUserId: adminId, distributedCount: secondRun.distributed }
  });
  expect(afterSecond.batch.id).not.toBe(afterFirst.batch.id);

  // Si llegara un evento scheduled para la misma semana ya repartida manualmente, CRON sigue omitiéndolo.
  await scheduled(Date.now());
  expect((await status()).weekBatchCount).toBe(2);
});