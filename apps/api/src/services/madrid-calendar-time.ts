export const madridZone = 'Europe/Madrid';
const formatter = new Intl.DateTimeFormat('sv-SE', {
  timeZone: madridZone, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
});

export function madridMinute(ms: number): string {
  const p = Object.fromEntries(formatter.formatToParts(ms).map(({ type, value }) => [type, value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

/** Local civil minute, optionally qualified by Madrid's offset during the autumn fold. */
export function madridInstant(input: string): string | null {
  const m = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})(\+01:00|\+02:00)?$/.exec(input);
  if (!m) return null;
  const candidates = (m[2] ? [m[2]] : ['+01:00', '+02:00']).map(offset => Date.parse(m[1] + offset))
    .filter(ms => Number.isFinite(ms) && madridMinute(ms) === m[1]);
  return candidates.length === 1 ? new Date(candidates[0]!).toISOString() : null;
}

export function mondayOpening(first: number): number {
  const date = new Date(madridMinute(first).slice(0, 10) + 'T00:00:00Z');
  date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
  return Date.parse(madridInstant(date.toISOString().slice(0, 10) + 'T07:00')!);
}