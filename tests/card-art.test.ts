import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SEASON_CARDS } from '../packages/shared/src/season-cards';
import { CARD_ART, cardArtUrl } from '../apps/web/src/lib/card-art';
import { CardArtwork } from '../apps/web/src/features/hand/CardArtwork';
import { Card } from '../apps/web/src/features/hand/CardFan';
const handCss = readFileSync(new URL('../apps/web/src/features/hand/hand.css', import.meta.url), 'utf8');

// Resolve the real renderer and React from web, not the root's dependencies.
const requireWeb = createRequire(new URL('../apps/web/package.json', import.meta.url));
const { createElement } = requireWeb('react');
const { renderToStaticMarkup } = requireWeb('react-dom/server');

const fallbackDefinition = {
  name: 'Carta de prueba', nickname: 'Apodo de prueba', description: 'Efecto de prueba.',
  imageUrl: '/icons/league-192.png', targetType: 'NONE', rarity: 'COMMON'
} as const;

const unknownSlugs = [
  'carta-desconocida', 'toString', 'constructor', '__proto__', 'hasOwnProperty',
  '../esclavitud', 'esclavitud.webp', 'ESCLAVITUD',
  '<img src=x onerror=alert(1)>', 'javascript:alert(1)',
  '../../docs/muestras-cartas/cartas/esclavitud.webp',
  'esclavitud" onerror="alert(1)', 'esclavitud?url', 'esclavitud\u0000'
];

// Acceptance criteria: exact season catalog, original WebP URLs and safe lookup.
describe('ilustraciones oficiales de las 33 cartas', () => {
  it('contiene exactamente los slugs de SEASON_CARDS, sin ausencias ni extras', () => {
    expect(SEASON_CARDS).toHaveLength(33);
    expect(Object.keys(CARD_ART)).toHaveLength(33);
    expect(Object.keys(CARD_ART).sort()).toEqual(SEASON_CARDS.map(card => card.slug).sort());
    expect(new Set(Object.values(CARD_ART)).size).toBe(33);
    expect(Object.isFrozen(CARD_ART)).toBe(true);
  });

  it.each(SEASON_CARDS)('$slug resuelve su original WebP real mediante el glob eager', ({ slug }) => {
    const url = cardArtUrl(slug);
    expect(typeof url).toBe('string');
    expect(url).toBe(CARD_ART[slug]);
    expect(url).toMatch(/\.webp(?:\?[^#]*)?$/u);
    expect(new URL(url!, 'https://munchinking.test').pathname.split('/').at(-1)).toBe(`${slug}.webp`);
  });

  it('Esclavitud usa esclavitud.webp, no la imagen de otra carta', () => {
    expect(cardArtUrl('esclavitud')).toMatch(/\/esclavitud\.webp(?:\?[^#]*)?$/u);
    expect(cardArtUrl('esclavitud')).not.toBe(cardArtUrl('cheque-misterioso'));
    expect(cardArtUrl('esclavitud')).not.toBe(cardArtUrl('mus'));
  });

  it.each(unknownSlugs)('no resuelve slugs desconocidos, heredados o inyectados: %j', slug => {
    expect(cardArtUrl(slug)).toBeUndefined();
    expect(Object.hasOwn(CARD_ART, slug)).toBe(false);
  });

  it('no proporciona imagen cuando falta el slug o está vacío', () => {
    expect(cardArtUrl()).toBeUndefined();
    expect(cardArtUrl('')).toBeFalsy();
  });
});

// Acceptance criteria: accessible artwork without a duplicate text face; safe fallback.
describe('renderizado real de CardArtwork y Card', () => {
  it('CardArtwork sustituye sus hijos por la imagen oficial', () => {
    const html = renderToStaticMarkup(createElement(CardArtwork, {
      slug: 'esclavitud', name: 'Esclavitud'
    }, createElement('span', null, 'Ficha alternativa')));
    expect(html).toContain(`src="${cardArtUrl('esclavitud')}"`);
    expect(html).toContain('alt="Anverso de Esclavitud"');
    expect(html).not.toContain('Ficha alternativa');
  });

  it.each(SEASON_CARDS)('Card oficial $slug muestra solo el anverso y el nombre canónico', card => {
    const html = renderToStaticMarkup(createElement(Card, {
      definition: { ...fallbackDefinition, slug: card.slug }
    }));
    expect(html.match(/<img\b/gu)).toHaveLength(1);
    expect(html).toContain('class="ml-card-artwork"');
    expect(html).toContain(`src="${cardArtUrl(card.slug)}"`);
    expect(html).toContain(`alt="Anverso de ${card.name}"`);
    expect(html).toContain('width="608"');
    expect(html).toContain('height="874"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('decoding="async"');
    expect(html).not.toMatch(/class="ml-hand-(?:face|name|nick|effect|target|rarity)"/u);
    expect(html).not.toContain(fallbackDefinition.name);
    expect(html).not.toContain(fallbackDefinition.nickname);
    expect(html).not.toContain(fallbackDefinition.description);
    expect(html.replace(/<[^>]*>/gu, '')).toBe('');
  });

  it.each([undefined, '', ...unknownSlugs])('CardArtwork conserva sus hijos sin arte para %j', slug => {
    const html = renderToStaticMarkup(createElement(CardArtwork, {
      slug, name: 'Carta de prueba'
    }, createElement('span', null, 'Ficha alternativa')));
    expect(html).toBe('<span>Ficha alternativa</span>');
  });

  it.each([undefined, '', ...unknownSlugs])('Card conserva la ficha de texto para %j', slug => {
    const html = renderToStaticMarkup(createElement(Card, {
      definition: { ...fallbackDefinition, slug }
    }));
    expect(html).toContain('class="ml-hand-face"');
    expect(html).toContain('data-rarity="COMMON"');
    expect(html).toContain(fallbackDefinition.name);
    expect(html).toContain(fallbackDefinition.nickname);
    expect(html).toContain(fallbackDefinition.description);
    expect(html).toContain('Sin objetivo');
    expect(html).not.toContain('ml-card-artwork');
    expect(html).not.toContain('onerror=');
    expect(html).not.toContain('javascript:');
  });

  it('el CSS del anverso mantiene la proporción y contiene la imagen sin recortarla', () => {
    const artworkRule = handCss.match(/\.ml-card-artwork\s*\{([^}]*)\}/u)?.[1];
    expect(artworkRule).toBeDefined();
    expect(artworkRule).toMatch(/\bobject-fit\s*:\s*contain\s*;/u);
    expect(artworkRule).toMatch(/\baspect-ratio\s*:\s*608\s*\/\s*874\s*;/u);
    expect(artworkRule).toMatch(/\bwidth\s*:\s*100%\s*;/u);
    expect(artworkRule).toMatch(/\bheight\s*:\s*auto\s*;/u);
    expect(artworkRule).not.toMatch(/\bobject-fit\s*:\s*cover\b/u);
  });
});