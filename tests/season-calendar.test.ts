import { describe, expect, it } from 'vitest';
import { evaluateCalendar, type CalendarRound } from '../apps/api/src/services/season-calendar';
import { madridInstant } from '../apps/api/src/services/madrid-calendar-time';

const iso = (local: string) => madridInstant(local)!;
const row: CalendarRound = { roundNumber: 1, firstStart: iso('2032-04-09T20:00'), lastStart: iso('2032-04-11T18:00'), endAt: iso('2032-04-11T20:10'), endKind: 'actual', revision: 1 };
const next: CalendarRound = { ...row, roundNumber: 2, firstStart: iso('2032-04-12T19:00'), lastStart: iso('2032-04-13T21:00'), endAt: iso('2032-04-13T23:00'), endKind: 'planned' };
const at = (slug: string, local: string, rows = [row]) => evaluateCalendar(rows, slug, iso(local));

describe('hora civil de Madrid, independiente de la zona del proceso', () => {
  it('resuelve verano e invierno y no normaliza fechas inválidas ni huecos', () => {
    expect(iso('2026-01-01T07:00')).toBe('2026-01-01T06:00:00.000Z');
    expect(iso('2026-07-01T07:00')).toBe('2026-07-01T05:00:00.000Z');
    for (const local of ['2026-02-30T12:00', '2026-03-29T02:30', '2026-10-25T02:30', '2026-07-01T07:00+01:00']) expect(madridInstant(local)).toBeNull();
    expect(iso('2026-10-25T02:30+02:00')).toBe('2026-10-25T00:30:00.000Z');
    expect(iso('2026-10-25T02:30+01:00')).toBe('2026-10-25T01:30:00.000Z');
  });
});

it.each([
  ['titular-obligatorio','2032-04-09T06:59','closed'], ['jugador-prohibido','2032-04-09T07:00','open'],
  ['titular-obligatorio','2032-04-09T18:00','open'], ['jugador-prohibido','2032-04-09T18:01','closed'],
  ['cesion-obligatoria','2032-04-09T17:59','open'], ['prohibido-capitan-y-ariete','2032-04-09T18:00','closed'],
  ['2-pa-2','2032-04-09T18:00','closed'], ['jugador-n12','2032-04-09T20:00','closed'],
  ['blindaje-de-cartas','2032-04-05T06:59','closed'], ['super-capitan','2032-04-05T07:00','open'],
  ['equipo-vetado','2032-04-05T20:00','open'], ['equipo-vetado','2032-04-05T20:01','closed'],
  ['cambio-de-jugador','2032-04-09T20:00','open'], ['cambio-de-jugador','2032-04-11T18:00','closed'],
  ['alineacion-congelada','2032-04-09T20:00','closed'], ['alineacion-congelada','2032-04-09T23:59','open'], ['alineacion-congelada','2032-04-10T00:00','closed'],
  ['egoista','2032-04-11T20:10','open'], ['intercambio-puntuacion-jugador','2032-04-11T20:11','external'],
  ['cambio-de-puntuacion','2032-04-11T20:09','closed'], ['cambio-de-puntuacion','2032-04-12T20:10','open']
])('%s · %s → %s', (slug, local, status) => expect(at(slug!,local!).status).toBe(status));

it.each(['capitan-obligatorio','jugador-inutil','subir-al-primer-equipo','caja-misteriosa'])('gracia limitada de %s', slug => {
  expect(at(slug, '2032-04-09T20:04').firstFiveMinuteGrace).toBe(true);
  expect(at(slug, '2032-04-09T20:05').firstFiveMinuteGrace).toBe(false);
  expect(at(slug, '2032-04-11T18:00').status).toBe('closed');
});

it('elige actual, siguiente o recién finalizada según la carta, no la primera fila', () => {
  const rows = [next, row];
  expect(at('capitan-obligatorio','2032-04-10T12:00',rows).round).toEqual(row);
  expect(at('cesion-obligatoria','2032-04-10T12:00',rows).round).toEqual(next);
  expect(at('blindaje-de-cartas','2032-04-12T07:00',rows)).toMatchObject({status:'open', round: next});
  expect(at('cambio-de-puntuacion','2032-04-12T20:10',rows)).toMatchObject({status:'open', round: row});
  expect(at('cambio-de-puntuacion','2032-04-12T20:11',rows).status).toBe('closed');
});

it('delega ante vacío, solo histórico, hueco, solapamiento o fin no confirmado', () => {
  expect(at('mus','2032-04-09T12:00').status).toBe('external');
  for (const slug of ['equipo-vetado','jugador-inutil','cambio-de-puntuacion','egoista']) {
    expect(at(slug,'2032-08-01T00:00',[]).status).toBe('external');
    expect(at(slug,'2032-08-01T00:00').status).toBe('external');
  }
  expect(at('blindaje-de-cartas','2032-04-12T08:00',[row,{...next,roundNumber:3}]).status).toBe('external');
  expect(at('jugador-inutil','2032-04-10T11:00',[row,{...next,firstStart:row.firstStart}]).status).toBe('external');
  expect(at('cambio-de-puntuacion','2032-04-11T20:10',[{...row,endKind:'planned'}]).status).toBe('external');
  expect(at('cambio-de-puntuacion','2032-04-13T22:00',[row,next]).status).toBe('external');
});

it('cuatro días: si la hora civil y 96 horas discrepan por DST, pide confirmación', () => {
  const dst = { ...row, firstStart:iso('2026-03-30T12:00'), lastStart:iso('2026-03-31T12:00'), endAt:iso('2026-03-31T14:00') };
  expect(at('equipo-vetado','2026-03-26T11:00',[dst]).status).toBe('open');
  expect(at('equipo-vetado','2026-03-26T11:30',[dst]).status).toBe('external');
  expect(at('equipo-vetado','2026-03-26T12:01',[dst]).status).toBe('closed');
});