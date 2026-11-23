import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { INITIAL_CARD_CATALOG_SEED } from './cards.seed';
import { catalogStatements, deterministicUuid, knownSeason, sqlString } from './catalog.sql';

const demoSlugs = ['presi-culo','clausulazo-congelado','impuesto-revolucionario','prima-por-objetivo',
  'veto-de-alineacion','inspeccion-hacienda','subvencion-municipal','mercado-intervenido',
  'indulto-comite','doble-capitania','caos-en-el-sorteo','corona-munchinking','amnistia-dorada'];

export function buildCatalogUpgradeSql(): string {
  const cards = INITIAL_CARD_CATALOG_SEED;
  if (cards.length !== 33 || new Set(cards.map(c => c.slug)).size !== 33 || cards.some(c => demoSlugs.includes(c.slug))) {
    throw new Error('El catálogo T26/27 debe tener 33 slugs únicos distintos de los de demostración.');
  }
  // The only globally retired definitions are the exact original seed identities.
  const demos = demoSlugs.map(slug => `('${deterministicUuid(`card_definition:${slug}`)}', ${sqlString(slug)})`);
  return [...catalogStatements(cards), `UPDATE card_definition SET is_enabled = 0 WHERE is_enabled = 1 AND ${knownSeason} AND (id, slug) IN (VALUES ${demos.join(', ')});`].join('\n') + '\n';
}

const current = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === resolve(current)) {
  const output = resolve(dirname(current), '../.generated/catalog-t26-27.sql');
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, buildCatalogUpgradeSql(), 'utf8');
  console.log(`SQL de catálogo generado: ${output}`);
}