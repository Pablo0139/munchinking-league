import { readdirSync, readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INITIAL_CARD_CATALOG_SEED } from '../db/seed/cards.seed';
import { catalogStatements, deterministicUuid, leagueId, seasonId } from '../db/seed/catalog.sql';

// Requisitos: conservar manos/mazo e historial, integridad FK, IDs del catálogo,
// resiembra idempotente y migración sin datos. Los identificadores antiguos son
// fixtures de regresión intencionales, no erratas pendientes de corregir.
const migrationName = '0006_rename_esclavitud.sql';
const migrationsDir = new URL('../db/migrations/', import.meta.url);
const migrationSql = readFileSync(new URL(migrationName, migrationsDir), 'utf8');
const at = '2026-11-24T12:00:00.000Z';
const oldSlug = 'exclavitud';
const newSlug = 'esclavitud';
const definitionId = (slug: string) => deterministicUuid(`card_definition:${slug}`);
const copyId = (slug: string, n: number) => deterministicUuid(`card_copy:${seasonId}:${slug}:${n}`);
const oldDefinitionId = definitionId(oldSlug);
const newDefinitionId = definitionId(newSlug);
const officialCard = INITIAL_CARD_CATALOG_SEED.find(card => card.slug === newSlug);
if (!officialCard) throw new Error('El catálogo real debe contener Esclavitud');
const renamedCard = officialCard;
const legacyCard = {
  ...renamedCard, slug: oldSlug, name: 'Exclavitud',
  whatsappTemplate: renamedCard.whatsappTemplate.replaceAll('Esclavitud', 'Exclavitud')
};
const mirrorCard = INITIAL_CARD_CATALOG_SEED.find(card => card.slug === 'carta-espejo');
if (!mirrorCard) throw new Error('El catálogo real debe contener Carta Espejo');
const controlCard = mirrorCard;
const tables = [
  'league', 'season', 'user', 'manager', 'distribution_batch', 'card_definition',
  'card_copy', 'card_movement', 'card_play_effect', 'notification'
] as const;
let db: DatabaseSync;

function rows(table: typeof tables[number]) {
  return db.prepare(`SELECT * FROM ${table} ORDER BY ${table === 'card_play_effect' ? 'movement_id' : 'id'}`).all();
}

function snapshot() {
  return Object.fromEntries(tables.map(table => [table, rows(table)]));
}

// D1 ejecuta un batch/migración de forma transaccional. No envolver cada UPDATE
// por separado: defer_foreign_keys debe vivir hasta el COMMIT de toda la migración.
function migrate() {
  db.exec('BEGIN');
  try {
    db.exec(migrationSql);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

function expectValidForeignKeys() {
  expect(db.prepare('PRAGMA foreign_keys').get()).toEqual({ foreign_keys: 1 });
  expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
  expect(db.prepare('PRAGMA defer_foreign_keys').get()).toEqual({ defer_foreign_keys: 0 });
}

function seedSeason() {
  db.prepare('INSERT INTO league (id, name, created_at) VALUES (?, ?, ?)')
    .run(leagueId, 'Liga de prueba', at);
  db.prepare('INSERT INTO season (id, league_id, name, is_active, created_at) VALUES (?, ?, ?, 1, ?)')
    .run(seasonId, leagueId, '2026/27', at);
}

function seedLegacyHistory() {
  seedSeason();
  // Solo dos cartas del catálogo: la antigua y un control para detectar daños colaterales.
  db.exec(catalogStatements([legacyCard, controlCard]).join('\n'));
  db.prepare(`INSERT INTO user (id, username, password_hash, role, created_at, updated_at)
    VALUES ('user', 'fixture', 'not-a-real-password-hash', 'MANAGER', ?, ?)`).run(at, at);
  db.prepare(`INSERT INTO manager (id, user_id, league_id, display_name, created_at)
    VALUES ('manager', 'user', ?, 'Mánager de prueba', ?)`).run(leagueId, at);
  db.prepare(`INSERT INTO distribution_batch
    (id, season_id, week_key, trigger_source, triggered_by_user_id, distributed_count,
     skipped_full_hand_count, created_at, skipped_full_hand_managers)
    VALUES ('batch', ?, '2026-W48', 'ADMIN', 'user', 1, 0, ?, '[]')`).run(seasonId, at);
  db.prepare("UPDATE card_copy SET location = 'HAND', current_manager_id = 'manager' WHERE id = ?")
    .run(copyId(oldSlug, 1));

  const movement = db.prepare(`INSERT INTO card_movement
    (id, season_id, card_copy_id, manager_id, actor_user_id, movement_type,
     from_location, to_location, target_manager_id, target_label, whatsapp_message,
     distribution_batch_id, related_movement_id, notes, created_at)
    VALUES (?, ?, ?, 'manager', 'user', ?, ?, ?, NULL, NULL, ?, ?, ?, ?, ?)`);
  movement.run('deal', seasonId, copyId(oldSlug, 1), 'DEALT', 'DECK', 'HAND',
    'Recibes Exclavitud.', 'batch', null, null, at);
  movement.run('play', seasonId, copyId(oldSlug, 2), 'PLAYED', 'HAND', 'DECK',
    'Juega *Exclavitud*.', null, null, 'Exclavitud: conservar importe 42 €.', at);
  movement.run('mirror', seasonId, copyId(controlCard.slug, 1), 'PLAYED', 'HAND', 'DECK',
    'Carta Espejo.', null, 'play', 'Sin cambios.', at);

  const effect = db.prepare(`INSERT INTO card_play_effect
    (movement_id, choices_json, summary, round_number, mirror_source_id, effective_slug, effective_choices_json)
    VALUES (?, ?, ?, 7, ?, ?, ?)`);
  effect.run('play', '{"roll":2}', 'Exclavitud: resultado histórico 42 €.', null, oldSlug, '{"roll":2}');
  effect.run('mirror', '{}', 'Resultado reflejado 42 €.', 'play', oldSlug, '{"roll":2}');
  const notification = db.prepare(`INSERT INTO notification
    (id, manager_id, notification_type, title, message, related_movement_id, is_read, read_at, created_at)
    VALUES (?, 'manager', 'CARD_PLAYED', ?, ?, ?, ?, ?, ?)`);
  notification.run('notice', 'Exclavitud', 'Se jugó Exclavitud; importe 42 €.', 'play', 1, at, at);
  notification.run('unread', 'Carta recibida', 'Recibes Exclavitud.', 'deal', 0, null, at);
  notification.run('control', 'Otro aviso', 'Sin cambios.', null, 0, null, at);
  expectValidForeignKeys();
}

beforeEach(() => {
  db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  for (const name of readdirSync(migrationsDir).filter(name => name.endsWith('.sql') && name < migrationName).sort()) {
    db.exec(readFileSync(new URL(name, migrationsDir), 'utf8'));
  }
  expectValidForeignKeys();
});

afterEach(() => db.close());

describe('0006: renombrar Esclavitud sin perder estado ni historial', () => {
  it('usa exactamente los IDs deterministas derivados por el generador real del catálogo', () => {
    expect(renamedCard.defaultCopies).toBe(2);
    expect(oldDefinitionId).toBe('575fa6fb-79b9-45fb-8588-761290adacdd');
    expect(newDefinitionId).toBe('350e6275-95a8-44c4-81fe-c5caf0373fc2');
    expect([copyId(oldSlug, 1), copyId(oldSlug, 2)]).toEqual([
      '70088af1-678e-454f-8a51-91b86addfe5f', 'c76381d3-3c0f-415a-87d5-73a4d6028aff'
    ]);
    expect([copyId(newSlug, 1), copyId(newSlug, 2)]).toEqual([
      'aceee8b0-1528-46e3-8862-51eb766e7fe0', 'a6684348-0222-4b0c-8a29-7e3561baa6df'
    ]);
  });

  it('conserva cada fila, propietario, ubicación y relación; solo transforma los campos previstos', () => {
    seedLegacyHistory();
    const before = snapshot();
    const renameCopy = (id: unknown) => id === copyId(oldSlug, 1) ? copyId(newSlug, 1)
      : id === copyId(oldSlug, 2) ? copyId(newSlug, 2) : id;
    const renameText = (value: unknown) => typeof value === 'string'
      ? value.replaceAll('Exclavitud', 'Esclavitud') : value;

    migrate();

    // Comparaciones completas (incluidos NULL, timestamps, flags y JSON), no solo recuentos.
    expect(rows('card_definition')).toEqual(before.card_definition.map(row => row.id === oldDefinitionId
      ? { ...row, id: newDefinitionId, slug: newSlug, name: 'Esclavitud', whatsapp_template: renameText(row.whatsapp_template) }
      : row).sort((a, b) => String(a.id).localeCompare(String(b.id))));
    expect(rows('card_copy')).toEqual(before.card_copy.map(row => ({
      ...row, id: renameCopy(row.id),
      card_definition_id: row.card_definition_id === oldDefinitionId ? newDefinitionId : row.card_definition_id
    })).sort((a, b) => String(a.id).localeCompare(String(b.id))));
    expect(rows('card_movement')).toEqual(before.card_movement.map(row => ({
      ...row, card_copy_id: renameCopy(row.card_copy_id),
      whatsapp_message: renameText(row.whatsapp_message), notes: renameText(row.notes)
    })));
    // El snapshot JSON/resumen es inmutable; effective_slug cambia también en Carta Espejo.
    expect(rows('card_play_effect')).toEqual(before.card_play_effect.map(row => ({
      ...row, effective_slug: row.effective_slug === oldSlug ? newSlug : row.effective_slug
    })));
    expect(rows('notification')).toEqual(before.notification.map(row => ({
      ...row, title: renameText(row.title), message: renameText(row.message)
    })));
    for (const table of ['league', 'season', 'user', 'manager', 'distribution_batch'] as const) {
      expect(rows(table)).toEqual(before[table]);
    }
    expect(db.prepare('SELECT location, current_manager_id FROM card_copy WHERE id = ?')
      .get(copyId(newSlug, 1))).toEqual({ location: 'HAND', current_manager_id: 'manager' });
    expect(db.prepare('SELECT location, current_manager_id FROM card_copy WHERE id = ?')
      .get(copyId(newSlug, 2))).toEqual({ location: 'DECK', current_manager_id: null });
    expectValidForeignKeys();
  });

  it('re-ejecuta catalogStatements sin duplicar copias ni devolver la mano al mazo', () => {
    seedLegacyHistory();
    migrate();
    const before = snapshot();

    for (let attempt = 0; attempt < 2; attempt++) {
      db.exec(catalogStatements([renamedCard]).join('\n'));
      expect(snapshot()).toEqual(before);
      expect(db.prepare('SELECT id FROM card_copy WHERE card_definition_id = ? ORDER BY id')
        .all(newDefinitionId)).toEqual([copyId(newSlug, 1), copyId(newSlug, 2)].sort().map(id => ({ id })));
      expect(db.prepare('SELECT id FROM card_definition WHERE slug = ?').get(oldSlug)).toBeUndefined();
      expectValidForeignKeys();
    }
  });

  it('no falla sobre el esquema real vacío y permite cargar después el catálogo corregido', () => {
    const empty = snapshot();
    expect(() => migrate()).not.toThrow();
    expect(snapshot()).toEqual(empty);
    expectValidForeignKeys();

    seedSeason();
    db.exec(catalogStatements([renamedCard]).join('\n'));
    expect(rows('card_definition')).toHaveLength(1);
    expect(rows('card_copy').map(row => row.id).sort()).toEqual([
      copyId(newSlug, 1), copyId(newSlug, 2)
    ].sort());
    expectValidForeignKeys();
  });

  it('es inocua si solo existe el catálogo corregido y al repetir la migración', () => {
    seedSeason();
    db.exec(catalogStatements([renamedCard]).join('\n'));
    const before = snapshot();
    for (let attempt = 0; attempt < 2; attempt++) {
      migrate();
      expect(snapshot()).toEqual(before);
      expectValidForeignKeys();
    }
  });

  it('expone la colisión entre ambos catálogos sin dejar cambios parciales en una transacción', () => {
    seedLegacyHistory();
    db.exec(catalogStatements([renamedCard]).join('\n'));
    const before = snapshot();

    // Riesgo documentado mediante un test: el SQL no fusiona IDs/slugs coexistentes.
    expect(() => migrate()).toThrow(/UNIQUE constraint failed/);
    expect(snapshot()).toEqual(before);
    expectValidForeignKeys();
  });
});