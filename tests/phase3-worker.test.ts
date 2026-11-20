import { beforeAll, expect, it } from 'vitest';
import { useTestWorker } from './worker-fixture';

const { database, rpc, ok, login } = useTestWorker();

beforeAll(async () => {
  const db = await database();
  // The real seed starts with an empty hand. Deal two specific copies, not random rewards.
  for (const slug of ['presi-culo', 'prima-por-objetivo']) {
    const deal = await db.prepare(`UPDATE card_copy SET location = 'HAND', current_manager_id =
      (SELECT m.id FROM manager m JOIN user u ON u.id = m.user_id WHERE u.username = 'zacarias')
      WHERE id = (SELECT c.id FROM card_copy c JOIN card_definition d ON d.id = c.card_definition_id
        WHERE d.slug = ? AND c.location = 'DECK' ORDER BY c.id LIMIT 1)`).bind(slug).run();
    expect(deal.meta.changes).toBe(1);
  }
}, 30_000);

async function unauthorized(path: string, cookie = '') {
  const { response, body } = await rpc(path, 'GET', cookie);
  expect(response.status).toBe(401);
  expect(body.error.data.code).toBe('UNAUTHORIZED');
}

it('deniega sesión y mano sin cookie', async () => {
  await unauthorized('auth.me');
  await unauthorized('manager.getHand');
});

it('revoca la sesión al salir, incluso si se reutiliza la cookie anterior', async () => {
  const cookie = await login('zacarias');
  expect((await ok('auth.me', 'GET', cookie)).user.username).toBe('zacarias');
  const { response, body } = await rpc('auth.logout', 'POST', cookie);
  expect(response.status).toBe(200);
  expect(body.result.data).toEqual({ success: true });
  expect(response.headers.get('set-cookie')).toMatch(/^munchinking_session=;.*Max-Age=0/i);
  await unauthorized('manager.getHand', cookie);
});

it('juega contra otro manager y publica solo la jugada, nunca el descarte', async () => {
  const actor = await login('zacarias');
  const rival = await login('contratodo');
  const me = await ok('auth.me', 'GET', actor);
  const target = (await ok('auth.me', 'GET', rival)).manager;
  const hand = (cookie: string) => ok('manager.getHand', 'GET', cookie);
  const feed = () => ok('history.public', 'GET', rival, { limit: 50 });
  expect((await hand(rival)).cards).toEqual([]);
  const { cards } = await hand(actor);
  expect(cards).toHaveLength(2);
  const play = cards.find((c: { definition: { slug: string } }) => c.definition.slug === 'presi-culo');
  const discard = cards.find((c: { definition: { slug: string } }) => c.definition.slug === 'prima-por-objetivo');
  expect(play.definition.targetType).toBe('MANAGER');
  expect(discard).toBeDefined();
  const { managers } = await ok('manager.listTargets', 'GET', actor, { excludeSelf: true });
  expect(managers).toContainEqual(expect.objectContaining({ id: target.id, displayName: 'Contratodo' }));
  expect(managers).not.toContainEqual(expect.objectContaining({ id: me.manager.id }));

  const played = await ok('cards.play', 'POST', actor, { cardCopyId: play.cardCopyId, targetManagerId: target.id });
  expect(played.card).toMatchObject({ id: play.cardCopyId, location: 'DECK', currentManagerId: null });
  const { id, createdAt } = played.movement;
  const time = new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false
  }).format(new Date(createdAt)).replace(',', '');
  const message = [
    '🃏 *MUNCHINKING LEAGUE — CARTA JUGADA*', '👤 *Manager:* Bar Zacarías',
    '✨ *Carta:* Presi-Culo _El decreto del palco_ (Épica)', '🎯 *Objetivo:* Contratodo', '', '📜 *Efecto:*',
    'Bar Zacarías activa *Presi-Culo* contra *Contratodo*. El palco ha hablado y toca acatar la sanción presidencial.',
    '', `🕒 ${time} · Ref: #${id.slice(0, 8)}`
  ].join('\n');
  expect(played.whatsappMessage).toBe(message);
  const publicPlay = expect.objectContaining({ id, cardCopyId: play.cardCopyId, managerId: me.manager.id,
    movementType: 'PLAYED', targetManagerId: target.id, whatsappMessage: message });
  expect((await feed()).items).toEqual([publicPlay]);
  expect((await hand(actor)).cards).toEqual([discard]);

  const discarded = await ok('cards.discard', 'POST', actor, { cardCopyId: discard.cardCopyId });
  expect(discarded.card).toMatchObject({ id: discard.cardCopyId, location: 'DECK', currentManagerId: null });
  expect((await hand(actor)).cards).toEqual([]);
  const mine = await ok('history.mine', 'GET', actor, { movementType: 'DISCARDED' });
  expect(mine.items).toEqual([expect.objectContaining({ id: discarded.movement.id, cardCopyId: discard.cardCopyId, movementType: 'DISCARDED' })]);
  expect(await feed()).toEqual({ items: [publicPlay], nextCursor: null });
});