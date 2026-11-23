-- Immutable snapshot per official play. Old movements remain valid without an effect row.
CREATE TABLE card_play_effect (
  movement_id TEXT PRIMARY KEY NOT NULL REFERENCES card_movement(id) ON DELETE RESTRICT,
  choices_json TEXT NOT NULL,
  summary TEXT NOT NULL,
  round_number INTEGER,
  mirror_source_id TEXT REFERENCES card_movement(id) ON DELETE RESTRICT,
  effective_slug TEXT NOT NULL,
  effective_choices_json TEXT NOT NULL
);
CREATE INDEX idx_effect_mirror_source ON card_play_effect(mirror_source_id) WHERE mirror_source_id IS NOT NULL;