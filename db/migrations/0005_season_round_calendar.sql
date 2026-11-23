CREATE TABLE season_round_calendar (
  season_id TEXT NOT NULL REFERENCES season(id) ON DELETE RESTRICT,
  round_number INTEGER NOT NULL CHECK (round_number > 0),
  first_start TEXT NOT NULL,
  last_start TEXT NOT NULL,
  end_at TEXT NOT NULL,
  end_kind TEXT NOT NULL CHECK (end_kind IN ('planned', 'actual')),
  revision INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (season_id, round_number),
  CHECK (first_start <= last_start AND last_start < end_at)
);