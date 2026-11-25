import { describe, expect, it, vi } from 'vitest';
import { DomainRuleError, resolveSeasonPlay, type SeasonPlayContext } from '../packages/domain/src/index';
import { SEASON_CARDS, findSeasonCard } from '../packages/shared/src/season-cards';

const ctx: SeasonPlayContext = {
  actorId: 'id-a', managerNames: new Map([['id-a', 'Alba'], ['id-b', 'Belén']]),
  nowIso: '2026-11-22T09:00:00Z', roll: () => 1
};
const play = (slug: string, choices = {} as Record<string, string>, extra: Partial<SeasonPlayContext> = {}) =>
  resolveSeasonPlay(findSeasonCard(slug)!, choices, { ...ctx, ...extra });
const pack = { pack: 'Bronce', player1: 'Álex', player2: 'Luis', player3: 'Sol', player4: 'Pau', player5: 'Ana', player6: 'Unai' };
const mirror = { id: 'ref-1', cardName: 'Jugador Inútil', effect: 'No sumar puntos de este futbolista.', senderId: 'id-b', senderName: 'Belén' };

describe('contrato de las 33 cartas oficiales', () => {
  it('resuelve cada formulario del catálogo sin filtrar identificadores de mánager', () => {
    expect(SEASON_CARDS).toHaveLength(33);
    for (const card of SEASON_CARDS) {
      const choices = Object.fromEntries(card.fields.map(f => [f.key, f.options?.[0] ?? ({
        manager: f.key === 'first' ? 'id-a' : 'id-b', rival: 'id-b', movement: mirror.id,
        money: '12345', text: 'Club Norte', player: `Jugador ${f.key}`, choice: ''
      })[f.kind]]));
      const r = play(card.slug, choices, { mirror });
      expect(r.summary).not.toBe('');
      expect(r.details.join('\n')).toContain(r.summary);
      expect(r.details.join('\n')).not.toMatch(/id-[ab]/);
      for (const f of card.fields) {
        const missing = { ...choices };
        delete missing[f.key];
        expect(() => play(card.slug, missing, { mirror })).toThrow(DomainRuleError);
      }
    }
  });
  it.each([[1, 1, '1.200.000', '11-29'], [3, 2, '4.500.000', '12-06'], [5, 3, '10.000.000', '12-13']] as const)(
    'fondo: %i millones a %i semanas', (amount, weeks, total, date) => {
      const r = play('fondo-de-inversion', { amount: String(amount), weeks: String(weeks) });
      expect(r.summary).toContain(`${total} €`);
      expect(r.summary).toContain(`2026-${date}T09:00:00.000Z`);
    });
  it('distingue valor de mercado de precio pagado y conserva céntimos', () => {
    expect(play('cupon-de-descuento', { player: 'Luis', marketValue: '12345' }).summary).toContain('1.851,75 €');
    const r = play('bono-de-representacion', { buyer: 'id-b', player: 'Luis', purchasePrice: '9876,55' });
    expect(r.summary).toContain('987,66 €');
    expect(r.details.join(' ')).toContain('Belén');
    expect(r.details.join(' ')).toContain('Verificación externa');
  });
  it.each([[[1, 2, 3], '0 €', '-3.000.000 €'], [[5, 2, 5], '4.500.000 €', '1.500.000 €'], [[4, 4, 4], '9.000.000 €', '6.000.000 €']] as const)(
    'tragaperras: %j', (faces, total, net) => {
      let i = 0;
      const roll = vi.fn(() => faces[i++]!);
      const r = play('tragaperras', { amount: '3' }, { roll });
      expect(roll.mock.calls).toEqual([[5], [5], [5]]);
      expect(r.summary).toContain(faces.join(', '));
      expect(r.summary).toContain(`: ${total}. Neto: ${net}.`);
    });
  it('resuelve los d6 y la selección del sobre', () => {
    const roll = vi.fn(() => 6);
    expect(play('cheque-misterioso', {}, { roll }).summary).toContain('6.000.000 €');
    expect(play('esclavitud', {}, { roll }).summary).toContain('el doble');
    expect(play('esclavitud', {}, { roll: () => 5 }).summary).toContain('0 €');
    expect(play('sobre-trucado', pack, { roll }).targetLabel).toBe('Unai');
    expect(roll.mock.calls).toEqual([[6], [6], [6]]);
  });
  it('rechaza la zona de sesgo antes de reducir el entero aleatorio', () => {
    const random = vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementationOnce(buffer => {
      (buffer as Uint32Array)[0] = 0xffffffff; return buffer;
    }).mockImplementationOnce(buffer => { (buffer as Uint32Array)[0] = 5; return buffer; });
    try { expect(play('cheque-misterioso', {}, { roll: undefined }).summary).toContain('D6: 6'); }
    finally { random.mockRestore(); }
  });
  it('caja distingue ambos efectos sin inventar puntos ni minutos', () => {
    const modes = findSeasonCard('caja-misteriosa')!.fields[1]!.options!;
    expect(play('caja-misteriosa', { player: 'Pau', mode: modes[0]! }).summary).toContain('fijar en 7');
    expect(play('caja-misteriosa', { player: 'Pau', mode: modes[1]! }).summary).toContain('duplicar solo el exceso');
  });
  it('espejo conserva el efecto, emisor y referencia sin volver a tirar', () => {
    const roll = vi.fn(() => 2);
    const r = play('carta-espejo', { movement: mirror.id }, { mirror, roll });
    expect(r).toMatchObject({ targetManagerId: 'id-b', targetLabel: 'Belén' });
    expect(r.summary).toContain(mirror.effect);
    expect(r.summary).toContain('No se anula');
    expect(r.details.join(' ')).toContain(mirror.id);
    expect(roll).not.toHaveBeenCalled();
    for (const source of [undefined, { ...mirror, senderId: 'id-a' }, { ...mirror, id: 'otra' }, { ...mirror, cardName: 'Cambio de Puntuación' }]) {
      expect(() => play('carta-espejo', { movement: mirror.id }, { mirror: source })).toThrow(DomainRuleError);
    }
  });
  it.each([
    ['2026-11-22T08:59:59Z', false], ['2026-11-22T09:00:00Z', true], ['2026-11-22T21:00:00Z', true],
    ['2026-11-22T21:00:00.001Z', false], ['2026-11-21T12:00:00Z', false], ['2026-08-23T08:00:00Z', true]
  ] as const)('mercado dominical en Madrid: %s', (nowIso, open) => {
    const run = () => play('clausulazo-directo', { rival: 'id-b', player: 'Luis' }, { nowIso });
    if (open) expect(run).not.toThrow(); else expect(run).toThrow(DomainRuleError);
  });
  it('blindaje anticipado apunta al domingo futuro, no al mercado en curso', () => {
    for (const [nowIso, sunday] of [['2026-11-21T21:00:00Z', '2026-11-22'], ['2026-11-21T23:10:00Z', '2026-11-29']] as const) {
      expect(play('blindaje-de-clausulazos', { player: 'Ana' }, { nowIso }).summary).toContain(sunday);
    }
    expect(play('lesion-de-cruzado', { rival: 'id-b', player: 'Sol' }).summary).toContain('2026-11-25T09:00:00.000Z');
  });
  it('acepta al actor en un cambio de puntuación y conserva ambos nombres', () => {
    expect(play('cambio-de-puntuacion', { first: 'id-b', second: 'id-a' })).toMatchObject({ targetManagerId: null, targetLabel: 'Belén y Alba' });
  });
  it.each([
    ['mus', { extra: 'x' }], ['mus', JSON.parse('{"__proto__":"x"}')], ['sobre-trucado', { ...pack, player2: ' alex ' }],
    ['cambio-de-jugador', { incoming: 'Luis', outgoing: 'LUIS' }], ['egoista', { teammate: 'id-a' }],
    ['egoista', { teammate: 'ausente' }], ['cambio-de-puntuacion', { first: 'id-b', second: 'id-b' }],
    ['tragaperras', { amount: ' 1' }], ['sobre-trucado', { ...pack, pack: 'bronce' }],
    ...['', 'a\nb', 'a\tb', 'a\u007fb', 'a\u202eb', 'a\u2028b', 'x'.repeat(121)].map(player => ['venta-maxima', { player }]),
    ...['0', '-1', 'Infinity', '1e6', '123.456', '1000000000.01'].map(marketValue => ['cupon-de-descuento', { player: 'Ana', marketValue }])
  ] as [string, Record<string, string>][])('rechaza selecciones inválidas: %s %j', (slug, choices) => {
    expect(() => play(slug, choices)).toThrow(DomainRuleError);
  });
  it('no acepta resultados de dados imposibles', () => {
    for (const face of [0, 7, 1.5, NaN]) expect(() => play('cheque-misterioso', {}, { roll: () => face })).toThrow(DomainRuleError);
  });
});