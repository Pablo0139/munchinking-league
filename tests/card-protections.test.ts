import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { protectionGuard, type ProtectionInput } from '../apps/api/src/services/card-protections';

let db: DatabaseSync;
const at = (day: number) => `2026-11-${day}T12:00:00.000Z`;
beforeEach(() => {
  db = new DatabaseSync(':memory:');
  for (const migration of ['0000_initial_schema', '0005_season_round_calendar']) {
    db.exec(readFileSync(new URL(`../db/migrations/${migration}.sql`, import.meta.url), 'utf8'));
  }
  db.exec(`PRAGMA foreign_keys=OFF;
    CREATE TABLE card_play_effect(movement_id TEXT PRIMARY KEY, choices_json TEXT, summary TEXT, round_number INTEGER, mirror_source_id TEXT);
    INSERT INTO card_copy(id,season_id,card_definition_id,current_manager_id,location,created_at) VALUES ('incoming','s','x','actor','HAND','');`);
});
afterEach(() => db.close());

function round(n=1, start=20, last=22, end=23, kind='actual') {
  db.prepare('INSERT INTO season_round_calendar VALUES (?,?,?,?,?,?,1)').run('s',n,at(start),at(last),at(end),kind);
}
function source(slug: string, opts: { round?: number|null; owner?: string; target?: string; season?: string; when?: string; mirror?: string } = {}) {
  const { round=1, owner='shield', target=null, season='s', when=at(19), mirror=null } = opts;
  db.prepare(`INSERT INTO card_definition(id,slug,name,nickname,description,usage_rules,rarity,target_type,default_copies,image_url,whatsapp_template,created_at)
    VALUES (?,?,?,'','','','RARE','NONE',1,'','','')`).run(slug,slug,slug);
  db.prepare(`INSERT INTO card_copy(id,season_id,card_definition_id,location,created_at) VALUES (?,?,?,'DECK','')`).run(slug,season,slug);
  db.prepare(`INSERT INTO card_movement(id,card_copy_id,season_id,manager_id,target_manager_id,movement_type,from_location,to_location,created_at)
    VALUES (?,?,?,?,?,'PLAYED','HAND','DECK',?)`).run(slug,slug,season,owner,target,when);
  db.prepare(`INSERT INTO card_play_effect VALUES (?,?,'',?,?)`).run(slug,JSON.stringify({player:'  JOÃO   PÉÑA-LUZ  '}),round,mirror);
}
function allowed(slug: string, overrides: Partial<ProtectionInput> = {}) {
  const g = protectionGuard({seasonId:'s',actorId:'actor',slug,rarity:'EPIC',targetManagerIds:['shield'],
    players:['Joa\u0303o Pe\u0301ña-Luz'],nowIso:at(21),...overrides});
  return db.prepare(`UPDATE card_copy SET location='DECK',current_manager_id=NULL WHERE id=? AND (${g.sql})`).run('incoming',...g.binds).changes === 1;
}
function revoke(id: string) {
  db.prepare(`INSERT INTO card_movement(id,card_copy_id,season_id,manager_id,movement_type,from_location,to_location,related_movement_id,created_at)
    VALUES ('ret',?,'s','shield','RETURNED','DECK','HAND',?,?)`).run(id,id,at(21));
}

it('Blindaje de Cartas distingue objetivos de participantes y no cede ante una épica', () => {
  round(); source('blindaje-de-cartas');
  for (const slug of ['lesion-de-cruzado','alineacion-congelada','egoista','cambio-de-puntuacion']) {
    expect(allowed(slug,{targetManagerIds:['actor','shield']}),slug).toBe(false);
  }
  for (const slug of ['bono-de-representacion','venta-maxima','empresa-pantalla','subir-al-primer-equipo','mus','equipo-vetado','caja-misteriosa']) {
    expect(allowed(slug),slug).toBe(true);
  }
  expect(allowed('lesion-de-cruzado',{nowIso:at(18)})).toBe(true);
  expect(allowed('lesion-de-cruzado',{nowIso:at(23)})).toBe(true);
  expect(allowed('lesion-de-cruzado',{seasonId:'other'})).toBe(true);
  expect(allowed('carta-espejo',{effectiveSlug:'lesion-de-cruzado'})).toBe(false);
  revoke('blindaje-de-cartas'); expect(allowed('lesion-de-cruzado')).toBe(true);
});

it('Super-Capitán compara el jugador íntegro y el propietario conocido, no un compañero ni un prefijo', () => {
  round(); source('super-capitan');
  for (const slug of ['capitan-obligatorio','titular-obligatorio','cesion-obligatoria','clausulazo-directo','lesion-de-cruzado']) expect(allowed(slug),slug).toBe(false);
  for (const slug of ['jugador-prohibido','jugador-inutil']) expect(allowed(slug,{targetManagerIds:[]})).toBe(false);
  for (const name of ['João','João Pena-Luz','João Peña Luz','otro',"' OR 1=1 --"]) expect(allowed('jugador-inutil',{players:[name]})).toBe(true);
  expect(allowed('lesion-de-cruzado',{targetManagerIds:['other']})).toBe(true);
  expect(allowed('alineacion-congelada')).toBe(true);
  expect(allowed('carta-espejo',{effectiveSlug:'titular-obligatorio'})).toBe(false);
});

it('sin jornada vinculada o fiable no se fabrica una caducidad', () => {
  source('super-capitan'); expect(allowed('lesion-de-cruzado')).toBe(true);
  round(1,20,22,23,'planned'); expect(allowed('lesion-de-cruzado')).toBe(false);
  expect(allowed('lesion-de-cruzado',{nowIso:at(22)})).toBe(true);
  round(2,21,24,25); expect(allowed('lesion-de-cruzado')).toBe(true);
  db.exec('DELETE FROM season_round_calendar WHERE round_number=2; UPDATE card_play_effect SET round_number=NULL');
  expect(allowed('lesion-de-cruzado')).toBe(true);
});

it('Congelada cubre al rival, no al emisor; exige la posterior contigua y termina en su fin', () => {
  round(); source('alineacion-congelada',{owner:'actor',target:'shield',when:at(21)});
  round(3,28,29,30); expect(allowed('clausulazo-directo')).toBe(true);
  round(2,24,25,26); expect(allowed('clausulazo-directo',{nowIso:at(25)})).toBe(false);
  expect(allowed('clausulazo-directo',{nowIso:at(26)})).toBe(true);
  expect(allowed('lesion-de-cruzado')).toBe(true);
  expect(allowed('clausulazo-directo',{targetManagerIds:['other']})).toBe(true);
});

it('Congelada reflejada usa el destinatario de la réplica y no una fuente devuelta', () => {
  round(); round(2,24,25,26);
  source('alineacion-congelada',{owner:'shield',target:'other',when:at(21)});
  source('carta-espejo',{owner:'other',target:'shield',when:at(21),mirror:'alineacion-congelada'});
  expect(allowed('clausulazo-directo')).toBe(false);
  revoke('alineacion-congelada'); expect(allowed('clausulazo-directo')).toBe(true);
});

it('blindaje dominical usa Madrid y no exige calendario, incluso en el cambio de hora', () => {
  source('blindaje-de-clausulazos',{round:null,when:'2026-10-24T21:59:59.999Z'});
  const check = (nowIso: string) => allowed('clausulazo-directo',{nowIso});
  expect(check('2026-10-24T21:59:59.999Z')).toBe(true);
  expect(check('2026-10-24T22:00:00.000Z')).toBe(false);
  expect(check('2026-10-25T22:59:59.999Z')).toBe(false);
  expect(check('2026-10-25T23:00:00.000Z')).toBe(true);
  expect(check('2026-11-01T10:00:00.000Z')).toBe(true);
  db.exec("UPDATE card_movement SET created_at='2026-10-24T22:00:00.000Z'");
  expect(check('2026-10-25T10:00:00.000Z')).toBe(true);
  expect(check('2026-11-01T10:00:00.000Z')).toBe(false);
});

it('el veto de capitanía raro prevalece sobre la designación común en su jornada, incluso para el emisor', () => {
  round(); source('prohibido-capitan-y-ariete',{owner:'actor'});
  expect(allowed('capitan-obligatorio',{rarity:'COMMON'})).toBe(false);
  expect(allowed('titular-obligatorio',{rarity:'COMMON'})).toBe(true);
  expect(allowed('capitan-obligatorio',{rarity:'COMMON',nowIso:at(25)})).toBe(true);
});