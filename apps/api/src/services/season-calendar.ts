import type { D1Database } from '@cloudflare/workers-types';
import { madridInstant, madridMinute, mondayOpening } from './madrid-calendar-time';

export interface CalendarRound {
  roundNumber: number; firstStart: string; lastStart: string; endAt: string;
  endKind: 'planned' | 'actual'; revision: number;
}
export interface ScheduledWindow {
  status: 'open' | 'closed' | 'external';
  reason: string;
  round: CalendarRound | null;
  /** Only the explicitly waived player-start restrictions, not a general waiver. */
  firstFiveMinuteGrace: boolean;
}

export async function listCalendar(db: D1Database, seasonId: string): Promise<CalendarRound[]> {
  const { results } = await db.prepare(`SELECT round_number AS roundNumber, first_start AS firstStart,
    last_start AS lastStart, end_at AS endAt, end_kind AS endKind, revision
    FROM season_round_calendar WHERE season_id = ? ORDER BY first_start, round_number`).bind(seasonId).all<CalendarRound>();
  return results;
}

type Rule = 'liveGrace' | 'live' | 'morning2' | 'morning' | 'before2' | 'monday' | 'fourDays' | 'firstDay' | 'after' | 'after24';
const rules = new Map<string, Rule>([
  ['capitan-obligatorio', 'liveGrace'], ['jugador-inutil', 'liveGrace'], ['subir-al-primer-equipo', 'liveGrace'], ['caja-misteriosa', 'liveGrace'],
  ['cambio-de-jugador', 'live'], ['titular-obligatorio', 'morning2'], ['jugador-prohibido', 'morning2'], ['jugador-n12', 'morning'],
  ['cesion-obligatoria', 'before2'], ['prohibido-capitan-y-ariete', 'before2'], ['2-pa-2', 'before2'],
  ['blindaje-de-cartas', 'monday'], ['super-capitan', 'monday'], ['equipo-vetado', 'fourDays'], ['alineacion-congelada', 'firstDay'],
  ['egoista', 'after'], ['intercambio-puntuacion-jugador', 'after'], ['cambio-de-puntuacion', 'after24']
]);
const hour = 3_600_000;
const external = (reason: string, round: CalendarRound | null = null): ScheduledWindow =>
  ({ status: 'external', reason, round, firstFiveMinuteGrace: false });

/** Only decides the schedule condition. Never substitutes for lineup, target, market or score checks. */
export function evaluateCalendar(rows: readonly CalendarRound[], slug: string, nowIso: string): ScheduledWindow {
  const rule = rules.get(slug);
  if (!rule) return external('Esta carta no tiene una ventana verificable por jornada.');
  const now = Date.parse(nowIso);
  if (!Number.isFinite(now) || !/(Z|[+-]\d\d:\d\d)$/.test(nowIso)) return external('El instante no tiene zona inequívoca.');
  const sorted = [...rows].sort((a, b) => a.firstStart.localeCompare(b.firstStart));
  const previous = sorted.filter(r => Date.parse(r.firstStart) <= now).at(-1);
  const next = sorted.find(r => Date.parse(r.firstStart) > now);
  const current = previous && now < Date.parse(previous.endAt) ? previous : undefined;
  const ended = sorted.filter(r => Date.parse(r.endAt) <= now).at(-1);
  const post = rule === 'after' || rule === 'after24';
  const live = rule === 'live' || rule === 'liveGrace' || rule === 'firstDay';
  const round = post ? ended ?? current ?? next : live ? current ?? next : next ?? current;
  if (!round) return external('Falta una jornada de referencia; confirma el horario externamente.');
  if (post && current && ended && current.roundNumber !== ended.roundNumber + 1) {
    return external('No se puede identificar la jornada finalizada inmediatamente anterior.');
  }
  if (!live && !post && !next && current && now > Date.parse(current.firstStart)) {
    return external('La jornada en curso ya empezó y no consta el siguiente inicio.');
  }
  if (post && previous && ended && previous !== ended && previous.endKind === 'planned' && now >= Date.parse(previous.lastStart)) {
    return external('Confirma si la jornada más reciente ya ha finalizado.', previous);
  }
  const pos = sorted.indexOf(round);
  // An overlap or reversed numbering makes these candidate rounds unreliable, not unrelated history.
  const ambiguous = sorted.some((r, i) => i !== pos && (i < pos
    ? r.endAt > round.firstStart || r.roundNumber >= round.roundNumber
    : r.firstStart < round.endAt || r.roundNumber <= round.roundNumber));
  if (ambiguous || (previous && next && next.roundNumber !== previous.roundNumber + 1 && (!current || round === next))) {
    return external('La agenda tiene solapamientos, desorden o jornadas intermedias sin cargar.');
  }
  const first = Date.parse(round.firstStart), last = Date.parse(round.lastStart), end = Date.parse(round.endAt);
  const day = madridMinute(first).slice(0, 10);
  let open: boolean;
  switch (rule) {
    case 'after': case 'after24':
      if (round !== ended && round.roundNumber !== 1) return external('Falta el fin de la jornada anterior.');
      if (round.endKind === 'planned' && now >= last) return external('El fin previsto no acredita el fin real.', round);
      if (rule === 'after' && now > end) return external('El reglamento no fija cuánto dura «al finalizar».', round);
      if (rule === 'after24' && now > end + 24 * hour && !current && !next) return external('Solo consta histórico; no se conoce la última jornada disputada.');
      open = now >= end && (rule !== 'after24' || now <= end + 24 * hour); break;
    case 'liveGrace': case 'live': open = now >= first && now < last; break;
    case 'firstDay':
      if (round.endKind === 'planned' && now >= end) return external('Confirma que la jornada sigue en curso.', round);
      open = now > first && now < end && madridMinute(now).startsWith(day); break;
    case 'morning': case 'morning2':
      open = now >= Date.parse(madridInstant(day + 'T07:00')!) && (rule === 'morning' ? now < first : now <= first - 2 * hour); break;
    case 'before2': open = now < first - 2 * hour; break;
    case 'monday': open = now >= mondayOpening(first) && now < first; break;
    case 'fourDays': {
      const local = new Date(madridMinute(first) + ':00Z');
      local.setUTCDate(local.getUTCDate() - 4);
      const civil = madridInstant(local.toISOString().slice(0, 16));
      open = now <= first - 96 * hour;
      if (!civil || open !== (now <= Date.parse(civil))) return external('El cambio de hora hace ambigua la antelación de cuatro días.', round);
      break;
    }
  }
  return { status: open ? 'open' : 'closed', round,
    reason: open ? 'Dentro de la ventana horaria de la jornada.' : 'Fuera de la ventana horaria de la jornada.',
    firstFiveMinuteGrace: open && rule === 'liveGrace' && now < first + 5 * 60_000 };
}

export async function validateScheduledWindow(db: D1Database, seasonId: string, slug: string, nowIso: string): Promise<ScheduledWindow> {
  if (!rules.has(slug)) return external('No corresponde validar esta carta con la agenda.');
  try {
    return evaluateCalendar(await listCalendar(db, seasonId), slug, nowIso);
  } catch (error) {
    if (error instanceof Error && /no such table: (?:main\.)?season_round_calendar\b/i.test(error.message)) {
      return external('El módulo de agenda no está instalado.');
    }
    throw error;
  }
}