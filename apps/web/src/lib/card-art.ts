// Bundle the verified originals rather than maintaining a second copy in public/.
// Vite fingerprints these URLs, so a new illustration also invalidates browser caches.
const originals = import.meta.glob<string>('../../../../docs/muestras-cartas/cartas/*.webp', {
  eager: true, query: '?url', import: 'default'
});

export const CARD_ART: Readonly<Record<string, string>> = Object.freeze(Object.fromEntries(
  Object.entries(originals).map(([path, url]) => [path.split('/').at(-1)!.replace(/\.webp$/u, ''), url])
));

export function cardArtUrl(slug?: string): string | undefined {
  return slug && Object.hasOwn(CARD_ART, slug) ? CARD_ART[slug] : undefined;
}