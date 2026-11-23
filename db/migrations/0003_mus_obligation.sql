CREATE TABLE mus_obligation (
  movement_id TEXT NOT NULL REFERENCES card_movement(id) ON DELETE RESTRICT,
  manager_id TEXT NOT NULL REFERENCES manager(id) ON DELETE RESTRICT,
  PRIMARY KEY (manager_id, movement_id)
);