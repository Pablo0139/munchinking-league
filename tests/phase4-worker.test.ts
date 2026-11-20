import { beforeAll, expect, it } from 'vitest';
import { INITIAL_CARD_CATALOG_SEED as catalog } from '../db/seed/cards.seed';
import { useTestWorker } from './worker-fixture';

const { database, login, ok, rpc } = useTestWorker();
const stamp = '2026-11-18T12:00:00.000Z';
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const presi = catalog.find(card => card.slug === 'presi-culo')!;
let actor: string, rival: string;

beforeAll(async () => {
  actor = await login('zacarias');
  rival = await login('contratodo');
  const a = (await ok('auth.me', 'GET', actor)).manager.id;
  const b = (await ok('auth.me', 'GET', rival)).manager.id;
  const db = await database();
  const stmt = (sql: string, ...args: (string | null)[]) => db.prepare(sql).bind(...args);
  const season = await db.prepare('SELECT id FROM season WHERE is_active = 1').first('id');
  const copy = (slug: string) => stmt(`SELECT c.id FROM card_copy c JOIN card_definition d
    ON d.id = c.card_definition_id WHERE d.slug = ? ORDER BY c.id LIMIT 1`, slug).first('id');
  const p = await copy(presi.slug);
  const t = await copy('prima-por-objetivo');
  const r = await copy('amnistia-dorada');
  const movement = (n: number, card: string, manager: string, type: string, related?: number, s = season) => {
    const toHand = type === 'DISTRIBUTED' || type === 'RETURNED';
    return stmt(`INSERT INTO card_movement (id, season_id, card_copy_id, manager_id, movement_type,
      from_location, to_location, related_movement_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id(n), s, card, manager, type, toHand ? 'DECK' : 'HAND', toHand ? 'HAND' : 'DECK', related ? id(related) : null, stamp);
  };
  const notice = (n: number, manager: string, type: string, related?: number) => stmt(`INSERT INTO notification
    (id, manager_id, notification_type, related_movement_id, title, message, created_at) VALUES (?, ?, ?, ?, 'QA', 'QA', ?)`,
    id(n), manager, type, related ? id(related) : null, stamp);
  const newCopy = (n: number, s: string) => stmt(`INSERT INTO card_copy
    (id, season_id, card_definition_id, location, created_at) SELECT ?, ?, card_definition_id, 'DECK', ? FROM card_copy WHERE id = ?`,
    id(n), s, stamp, p);

  await db.batch([
    stmt(`INSERT INTO season (id, league_id, name, created_at) SELECT ?, league_id, 'Archivo QA', ? FROM season WHERE id = ?`, id(90), stamp, season),
    newCopy(91, id(90)), newCopy(92, season),
    stmt(`UPDATE card_definition SET is_enabled = 0 WHERE slug = ?`, 'indulto-comite'),
    movement(1, p, a, 'DISTRIBUTED'), movement(2, p, a, 'DISCARDED'), movement(3, p, b, 'DISTRIBUTED'),
    movement(4, t, a, 'DISTRIBUTED'), movement(5, t, a, 'PLAYED'), movement(6, t, a, 'RETURNED', 5),
    movement(7, t, a, 'PLAYED'), movement(8, r, b, 'DISTRIBUTED'), movement(9, r, b, 'PLAYED'),
    movement(10, id(91), a, 'PLAYED', undefined, id(90)),
    stmt(`UPDATE card_copy SET location = 'HAND', current_manager_id = ? WHERE id = ?`, b, p),
    notice(101, a, 'CARD_DISTRIBUTED', 1), notice(102, a, 'CARD_DISTRIBUTED', 3),
    notice(103, a, 'ADMIN_NOTICE', 1), notice(104, a, 'CARD_DISTRIBUTED', 2),
    notice(105, a, 'CARD_DISTRIBUTED'), notice(106, a, 'CARD_RETURNED', 6),
    ...[107, 108, 109, 110].map(n => notice(n, a, 'ADMIN_NOTICE')),
    notice(111, b, 'CARD_DISTRIBUTED', 3)
  ]);
}, 30_000);

type Item = { id: string };
const ids = (items: Item[]) => items.map(item => item.id);

it('library.list: catálogo habilitado, copias de temporada y ninguna copia ni propietario individual', async () => {
  const list = async (input?: object) => (await ok('library.list', 'GET', actor, input)).cards;
  const cards = await list();
  const enabled = catalog.filter(card => card.slug !== 'indulto-comite');
  expect(cards.map((c: { slug: string }) => c.slug).sort()).toEqual(enabled.map(c => c.slug).sort());
  for (const card of cards) {
    const def = enabled.find(c => c.slug === card.slug)!;
    expect(card).toEqual({ ...def, id: expect.any(String), createdAt: expect.any(String), isEnabled: expect.anything(),
      seasonCopiesCount: def.defaultCopies + Number(def.slug === presi.slug) });
  }
  for (const search of ['Presi-Culo', 'decreto del palco', 'condición presidencial']) {
    expect(await list({ rarity: 'EPIC', search })).toEqual([cards.find((c: { slug: string }) => c.slug === presi.slug)]);
  }
  expect(await list({ rarity: 'COMMON', search: presi.name })).toEqual([]);
  expect((await list({ rarity: 'LEGENDARY' })).map((c: { slug: string }) => c.slug).sort())
    .toEqual(['amnistia-dorada', 'corona-munchinking']);
});

it('history.public: solo PLAYED; la devolución identifica la jugada, no todas las de la copia', async () => {
  const feed = async (input: object) => {
    const page = await ok('history.public', 'GET', rival, input);
    expect(page.nextCursor).toBeNull();
    return page.items.map((row: Item & { movementType: string; isReturned: boolean }) => [row.id, row.movementType, row.isReturned]);
  };
  const active = [[id(9), 'PLAYED', false], [id(7), 'PLAYED', false]];
  expect(await feed({})).toEqual([...active, [id(5), 'PLAYED', true]]);
  expect(await feed({ activeOnly: true })).toEqual(active);
});

it('history.mine: aislamiento de cuenta y temporada, filtro y cursor con timestamps iguales', async () => {
  const mine = (cookie: string, input: object) => ok('history.mine', 'GET', cookie, input);
  expect(ids((await mine(actor, {})).items)).toEqual([7, 6, 5, 4, 2, 1].map(id));
  expect(ids((await mine(rival, {})).items)).toEqual([9, 8, 3].map(id));
  const filter = { movementType: 'PLAYED', limit: 1 };
  const first = await mine(actor, filter);
  expect(ids(first.items)).toEqual([id(7)]);
  expect(first.nextCursor).toEqual(expect.any(String));
  const second = await mine(actor, { ...filter, cursor: first.nextCursor });
  expect(ids(second.items)).toEqual([id(5)]);
  expect(second.items[0].createdAt).toBe(first.items[0].createdAt);
  expect(second.nextCursor).toBeNull();
});

it('manager.getProfile: métricas propias de temporada y mano actual', async () => {
  const stats = async (cookie: string) => (await ok('manager.getProfile', 'GET', cookie)).stats;
  expect(await stats(actor)).toEqual({ playedCount: 2, discardedCount: 1, returnedCount: 1, handCount: 0, maxHandSize: 3 });
  expect(await stats(rival)).toEqual({ playedCount: 1, discardedCount: 0, returnedCount: 0, handCount: 1, maxHandSize: 3 });
});

const listNotices = (cookie: string, input = {}) => ok('notifications.list', 'GET', cookie, { limit: 50, ...input });

it('notifications.list: revela solo la definición del reparto propio aunque la copia ahora sea del rival', async () => {
  const { name, nickname, description, usageRules, rarity, targetType, imageUrl } = presi;
  const expected = { name, nickname, description, usageRules, rarity, targetType, imageUrl };
  const summaries = (items: (Item & { card: unknown })[]) => items.map(n => [n.id, n.card]);
  expect(summaries((await listNotices(actor)).items)).toEqual([
    ...[110, 109, 108, 107, 106, 105, 104, 103, 102].map(n => [id(n), null]), [id(101), expected]
  ]);
  expect(summaries((await listNotices(rival)).items)).toEqual([[id(111), expected]]);
});

it('notificaciones: contador real 10→9→0, lectura idempotente individual y global, sin tocar al rival', async () => {
  const count = async (cookie: string) => (await ok('notifications.unreadCount', 'GET', cookie)).count;
  const one = () => ok('notifications.markAsRead', 'POST', actor, { notificationId: id(101) });
  const all = () => ok('notifications.markAllAsRead', 'POST', actor);
  const rivalBefore = await listNotices(rival);
  expect(await count(actor)).toBe(10);
  expect(await count(rival)).toBe(1);
  const denied = await rpc('notifications.markAsRead', 'POST', actor, { notificationId: id(111) });
  expect(denied.response.status).toBe(404);
  expect(denied.body.error.data.code).toBe('NOT_FOUND');
  const { notification } = await one();
  expect(notification).toMatchObject({ id: id(101), isRead: true, readAt: expect.any(String) });
  expect(Date.parse(notification.readAt)).not.toBeNaN();
  expect((await one()).notification.readAt).toBe(notification.readAt);
  expect(await count(actor)).toBe(9);
  expect(ids((await listNotices(actor, { unreadOnly: true })).items)).toEqual([110, 109, 108, 107, 106, 105, 104, 103, 102].map(id));
  expect(await all()).toEqual({ updatedCount: 9 });
  const read = await listNotices(actor);
  expect(read.items).toHaveLength(10);
  for (const n of read.items) expect(n).toMatchObject({ isRead: true, readAt: expect.any(String) });
  expect(read.items.find((n: Item) => n.id === id(101)).readAt).toBe(notification.readAt);
  expect(await all()).toEqual({ updatedCount: 0 });
  expect(await listNotices(actor)).toEqual(read);
  expect(await count(actor)).toBe(0);
  expect((await listNotices(actor, { unreadOnly: true })).items).toEqual([]);
  expect(await listNotices(rival)).toEqual(rivalBefore);
  expect(await count(rival)).toBe(1);
});