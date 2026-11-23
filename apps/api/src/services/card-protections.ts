import { madridInstant, madridMinute } from './madrid-calendar-time';

export interface ProtectionInput {
  seasonId: string;
  actorId: string;
  slug: string;
  /** Only for Carta Espejo: server-resolved original slug, with the replica's targets. */
  effectiveSlug?: string;
  rarity: 'COMMON' | 'RARE' | 'EPIC';
  targetManagerIds: string[];
  players: string[];
  nowIso: string;
}

const againstPlayer = new Set(['capitan-obligatorio', 'titular-obligatorio', 'jugador-prohibido',
  'jugador-inutil', 'cesion-obligatoria', 'clausulazo-directo', 'lesion-de-cruzado']);
const againstTeam = new Set([...againstPlayer, 'alineacion-congelada', 'intercambio-puntuacion-jugador',
  'cambio-de-puntuacion', 'egoista']); // Egoísta actually takes points from the teammate.

// SQLite lower() is ASCII-only. Apply the SAME per-character table on both sides, including
// historical choices. Keep punctuation, ñ, word boundaries and all unrecognised characters.
const folds: Record<string, string> = {};
for (let i = 0; i <= 0x024f; i++) {
  const c = String.fromCharCode(i);
  const folded = c.toLowerCase().normalize('NFD').replace(/\u0301/gu, '');
  if (folded !== c) folds[i] = folded;
}
folds[0x301] = '';
for (const c of '\t\n\v\f\r \u0085\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000') folds[c.codePointAt(0)!] = ' ';
const foldJson = JSON.stringify(folds);
const playerKey = (name: string) => Array.from(name, c => folds[c.codePointAt(0)!] ?? c).join('').replace(/ +/gu, ' ').replace(/^ | $/gu, '');

// Only a Sunday in Madrid can be covered. Activations on the previous Sunday count;
// activations today do not. Convert both midnights separately (a DST week need not be 168h).
function sundayWindow(now: number): string[] {
  const day = new Date(madridMinute(now).slice(0, 10) + 'T00:00:00Z');
  if (day.getUTCDay() !== 0) return [];
  const end = madridInstant(day.toISOString().slice(0, 10) + 'T00:00')!;
  day.setUTCDate(day.getUTCDate() - 7);
  return [madridInstant(day.toISOString().slice(0, 10) + 'T00:00')!, end];
}

const notReturned = (alias: string) => `NOT EXISTS (SELECT 1 FROM card_movement ret
  WHERE ret.related_movement_id=${alias}.id AND ret.season_id=${alias}.season_id AND ret.movement_type='RETURNED')`;

// Reject ambiguous chronology. A planned end is not evidence that the final match is still
// being played: from its kickoff onwards leave the decision to external confirmation.
const reliable = (r: string) => `NOT EXISTS (SELECT 1 FROM season_round_calendar other
  WHERE other.season_id=${r}.season_id AND ((other.round_number<${r}.round_number AND other.end_at>${r}.first_start)
    OR (other.round_number>${r}.round_number AND other.first_start<${r}.end_at)))`;
const live = (r: string) => `p.now < CASE ${r}.end_kind WHEN 'actual' THEN ${r}.end_at WHEN 'planned' THEN ${r}.last_start END`;

/** Append `AND (${sql})` and append binds in place. Never use as a separate preflight. */
export function protectionGuard(input: ProtectionInput): { sql: string; binds: (string | number)[] } {
  const pass = { sql: '1=1', binds: [] };
  const slug = input.slug === 'carta-espejo' ? input.effectiveSlug ?? '' : input.slug;
  if (!againstTeam.has(slug)) return pass;
  const targets = input.targetManagerIds.filter(Boolean);
  const names = againstPlayer.has(slug) ? input.players.map(playerKey).filter(Boolean) : [];
  if (!targets.length && !names.length) return pass;
  const now = Date.parse(input.nowIso);
  if (!Number.isFinite(now) || !/(Z|[+-]\d\d:\d\d)$/u.test(input.nowIso)) throw new RangeError('nowIso requiere un instante con zona');
  const direct = slug === 'clausulazo-directo';
  const sunday = direct ? sundayWindow(now) : [];
  const binds = [input.seasonId, input.actorId, new Date(now).toISOString(), JSON.stringify(targets), JSON.stringify(names), foldJson];
  const target = 'IN (SELECT value FROM json_each(p.targets))';
  const owned = targets.length ? `m.manager_id ${target}` : '1=1';
  const samePlayer = `EXISTS (WITH RECURSIVE chars(rest, key, ch) AS (
    SELECT json_extract(e.choices_json,'$.player'), '', '' WHERE json_type(e.choices_json,'$.player')='text'
    UNION ALL SELECT substr(rest,2), CASE WHEN ch=' ' AND substr(key,-1)=' ' THEN key ELSE key || ch END,
      coalesce(json_extract(p.folds,'$."' || unicode(substr(rest,1,1)) || '"'),substr(rest,1,1))
    FROM chars WHERE rest<>'' OR ch<>''
  ) SELECT 1 FROM chars WHERE rest='' AND ch='' AND trim(key) IN (SELECT value FROM json_each(p.names)))`;
  const cases: string[] = [];
  const inRound = `r.round_number IS NOT NULL AND m.created_at<r.first_start AND ${reliable('r')} AND ${live('r')}`;
  if (targets.length) cases.push(`(d.slug='blindaje-de-cartas' AND m.manager_id<>p.actor AND m.manager_id ${target} AND ${inRound})`);
  // The earlier league-wide ban also binds its own issuer. No captain can be appointed
  // by a lower-ranked card during that same round. Never reject a league-wide play merely
  // because one participant has an individual shield.
  if (slug === 'capitan-obligatorio' && input.rarity === 'COMMON') cases.push(`(d.slug='prohibido-capitan-y-ariete'
    AND d.rarity='RARE' AND r.first_start<=p.now AND p.now<r.last_start AND ${inRound})`);
  if (names.length) {
    const kinds = [`(d.slug='super-capitan' AND ${inRound})`];
    if (sunday.length) {
      kinds.push(`(d.slug='blindaje-de-clausulazos' AND m.created_at>=? AND m.created_at<?)`);
      binds.push(...sunday);
    }
    cases.push(`(${owned} AND (${kinds.join(' OR ')}) AND ${samePlayer})`);
  }
  if (direct && targets.length) cases.push(`(m.target_manager_id ${target} AND (d.slug='alineacion-congelada'
    OR (d.slug='carta-espejo' AND EXISTS (SELECT 1 FROM card_movement src
      JOIN card_copy sc ON sc.id=src.card_copy_id AND sc.season_id=src.season_id
      JOIN card_definition sd ON sd.id=sc.card_definition_id WHERE src.id=e.mirror_source_id
        AND src.season_id=m.season_id AND src.movement_type='PLAYED' AND sd.slug='alineacion-congelada'
        AND src.manager_id=m.target_manager_id AND src.target_manager_id=m.manager_id AND ${notReturned('src')})))
    AND m.created_at>=r.first_start AND m.created_at<r.end_at AND ${reliable('r')}
    AND EXISTS (SELECT 1 FROM season_round_calendar n WHERE n.season_id=r.season_id
      AND n.round_number=r.round_number+1 AND ${reliable('n')} AND ${live('n')}))`);
  return { binds, sql: `NOT EXISTS (WITH p(season,actor,now,targets,names,folds) AS (VALUES (?,?,?,?,?,?))
    SELECT 1 FROM p JOIN card_movement m ON m.season_id=p.season AND m.movement_type='PLAYED'
    JOIN card_play_effect e ON e.movement_id=m.id JOIN card_copy c ON c.id=m.card_copy_id AND c.season_id=m.season_id
    JOIN card_definition d ON d.id=c.card_definition_id LEFT JOIN season_round_calendar r
      ON r.season_id=m.season_id AND r.round_number=e.round_number
    WHERE m.created_at<=p.now AND ${notReturned('m')} AND (${cases.join(' OR ')}))` };
}