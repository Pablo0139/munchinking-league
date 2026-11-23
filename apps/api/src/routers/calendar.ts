import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { adminProcedure, router } from '../trpc/trpc';
import { changesOf, getActiveSeason } from '../services/data';
import { madridInstant, madridZone } from '../services/madrid-calendar-time';
import { listCalendar } from '../services/season-calendar';

const instant = z.string().max(22).transform((s, ctx) => {
  const iso = madridInstant(s);
  if (!iso) {
    ctx.addIssue({ code: 'custom', message: 'Hora de Madrid inválida, inexistente o repetida. En la hora repetida indica +01:00 o +02:00.' });
    return z.NEVER;
  }
  return iso;
});
const inputSchema = z.object({
  seasonId: z.string().min(1), roundNumber: z.number().int().positive().safe(),
  expectedRevision: z.number().int().nonnegative().safe(),
  firstStart: instant, lastStart: instant, endAt: instant, endKind: z.enum(['planned', 'actual'])
}).strict().refine(r => r.firstStart <= r.lastStart && r.lastStart < r.endAt,
  'El primer inicio no puede superar al último y el fin debe ser posterior.');

export const calendarRouter = router({
  list: adminProcedure.query(async ({ ctx }) => {
    const season = await getActiveSeason(ctx.env.DB, ctx.auth.manager.leagueId);
    return { seasonId: season?.id ?? null, zone: madridZone, rounds: season ? await listCalendar(ctx.env.DB, season.id) : [] };
  }),
  save: adminProcedure.input(inputSchema).mutation(async ({ ctx, input: r }) => {
    const db = ctx.env.DB, leagueId = ctx.auth.manager.leagueId;
    const active = 'SELECT id FROM season WHERE id = ? AND league_id = ? AND is_active = 1';
    if (r.endKind === 'actual' && Date.parse(r.endAt) > Date.now()) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Un fin futuro solo puede ser previsto.' });
    }
    const res = r.expectedRevision === 0
      ? await db.prepare(`INSERT INTO season_round_calendar (round_number, first_start, last_start, end_at, end_kind, season_id)
          SELECT ?, ?, ?, ?, ?, id FROM (${active}) WHERE 1 ON CONFLICT(season_id, round_number) DO NOTHING`)
        .bind(r.roundNumber, r.firstStart, r.lastStart, r.endAt, r.endKind, r.seasonId, leagueId).run()
      : await db.prepare(`UPDATE season_round_calendar SET first_start=?, last_start=?, end_at=?, end_kind=?, revision=revision+1
          WHERE round_number=? AND revision=? AND season_id IN (${active})`)
        .bind(r.firstStart, r.lastStart, r.endAt, r.endKind, r.roundNumber, r.expectedRevision, r.seasonId, leagueId).run();
    if (changesOf(res) !== 1) throw new TRPCError({ code: 'CONFLICT', message: 'La temporada o la jornada ha cambiado. Revisa la agenda antes de guardar.' });
    return { revision: r.expectedRevision + 1 };
  })
});