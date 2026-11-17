import type { D1Database } from '@cloudflare/workers-types';

export interface ActiveSeasonRow {
  id: string;
  leagueId: string;
  name: string;
  isActive: number;
  createdAt: string;
}

export async function getActiveSeason(
  db: D1Database,
  leagueId: string
): Promise<ActiveSeasonRow | null> {
  return db
    .prepare(
      `SELECT id, league_id AS leagueId, name, is_active AS isActive, created_at AS createdAt
       FROM season WHERE league_id = ? AND is_active = 1 LIMIT 1`
    )
    .bind(leagueId)
    .first<ActiveSeasonRow>();
}

export function changesOf(result: { meta?: { changes?: number } } | undefined): number {
  return result?.meta?.changes ?? 0;
}

export function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Error && /unique constraint|idx_distribution_season_week/i.test(error.message)
  );
}
