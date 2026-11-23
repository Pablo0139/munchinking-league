import type { D1Database, D1PreparedStatement } from '@cloudflare/workers-types';

type Action = 'PLAYED' | 'DISCARDED';

// Only called with internal SQL expressions, never request data. A RETURNED row
// invalidates exactly its own play, without an extra hook in admin.returnCard.
function pending(manager: string, season: string) {
  return `EXISTS (SELECT 1 FROM mus_obligation o JOIN card_movement source ON source.id = o.movement_id
    WHERE o.manager_id = ${manager} AND source.season_id = ${season}
      AND NOT EXISTS (SELECT 1 FROM card_movement r WHERE r.related_movement_id = source.id
                      AND r.movement_type = 'RETURNED'))`;
}

// The official rules have three ranks. LEGENDARY exists in legacy seasons only.
const rank = (column: string) => `CASE ${column} WHEN 'LEGENDARY' THEN 4 WHEN 'EPIC' THEN 3
  WHEN 'RARE' THEN 2 WHEN 'COMMON' THEN 1 ELSE 0 END`;

/** Append with AND to the unaliased UPDATE card_copy WHERE; no extra binds. */
export function musActionPredicate(action: Action): string {
  const free = `NOT ${pending('card_copy.current_manager_id', 'card_copy.season_id')}`;
  if (action === 'PLAYED') return free;
  return `(${free} OR NOT EXISTS (
    SELECT 1 FROM card_copy h JOIN card_definition other ON other.id = h.card_definition_id
    JOIN card_definition chosen ON chosen.id = card_copy.card_definition_id
    WHERE h.season_id = card_copy.season_id AND h.current_manager_id = card_copy.current_manager_id
      AND h.location = 'HAND' AND ${rank('other.rarity')} > ${rank('chosen.rarity')}))`;
}

/** Append immediately AFTER the movement INSERT in the same D1 batch. */
export function musAfterMovement(db: D1Database, action: Action, movementId: string): D1PreparedStatement {
  if (action === 'PLAYED') {
    return db.prepare(`INSERT INTO mus_obligation (movement_id, manager_id)
      SELECT p.id, m.id FROM card_movement p JOIN season s ON s.id = p.season_id
      JOIN card_copy c ON c.id = p.card_copy_id JOIN card_definition d ON d.id = c.card_definition_id
      JOIN manager m ON m.league_id = s.league_id AND m.id <> p.manager_id
      WHERE changes() = 1 AND p.id = ? AND p.movement_type = 'PLAYED' AND d.slug = 'mus'
        AND EXISTS (SELECT 1 FROM card_copy h WHERE h.current_manager_id = m.id
                    AND h.season_id = p.season_id AND h.location = 'HAND')`).bind(movementId);
  }
  return db.prepare(`DELETE FROM mus_obligation WHERE changes() = 1 AND EXISTS (
    SELECT 1 FROM card_movement discard JOIN card_movement source ON source.season_id = discard.season_id
    WHERE discard.id = ? AND discard.movement_type = 'DISCARDED' AND discard.manager_id = mus_obligation.manager_id
      AND source.id = mus_obligation.movement_id)`).bind(movementId);
}

/** Private hand status, suitable for batching with the hand query. */
export function musStatusStatement(db: D1Database, managerId: string, seasonId: string) {
  return db.prepare(`SELECT ${pending('?', '?')} AS required`).bind(managerId, seasonId);
}