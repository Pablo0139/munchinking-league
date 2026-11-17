-- Migration 0000: Initial Munchinking League D1 schema
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS `league` (
  `id` TEXT PRIMARY KEY NOT NULL,
  `name` TEXT NOT NULL,
  `created_at` TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS `idx_league_name` ON `league` (`name`);

CREATE TABLE IF NOT EXISTS `season` (
  `id` TEXT PRIMARY KEY NOT NULL,
  `league_id` TEXT NOT NULL,
  `name` TEXT NOT NULL,
  `is_active` INTEGER DEFAULT 0 NOT NULL,
  `created_at` TEXT NOT NULL,
  FOREIGN KEY (`league_id`) REFERENCES `league`(`id`) ON UPDATE NO ACTION ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS `idx_season_league_id` ON `season` (`league_id`);
CREATE UNIQUE INDEX IF NOT EXISTS `idx_season_single_active` ON `season` (`league_id`) WHERE `is_active` = 1;

CREATE TABLE IF NOT EXISTS `user` (
  `id` TEXT PRIMARY KEY NOT NULL,
  `username` TEXT NOT NULL,
  `password_hash` TEXT NOT NULL,
  `role` TEXT NOT NULL,
  `is_active` INTEGER DEFAULT 1 NOT NULL,
  `created_at` TEXT NOT NULL,
  `updated_at` TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS `idx_user_username_unique` ON `user` (`username`);

CREATE TABLE IF NOT EXISTS `session` (
  `id` TEXT PRIMARY KEY NOT NULL,
  `user_id` TEXT NOT NULL,
  `token_hash` TEXT NOT NULL,
  `expires_at` TEXT NOT NULL,
  `revoked_at` TEXT,
  `created_at` TEXT NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE NO ACTION ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS `idx_session_token_hash_unique` ON `session` (`token_hash`);
CREATE INDEX IF NOT EXISTS `idx_session_user_id` ON `session` (`user_id`);

CREATE TABLE IF NOT EXISTS `manager` (
  `id` TEXT PRIMARY KEY NOT NULL,
  `user_id` TEXT NOT NULL,
  `league_id` TEXT NOT NULL,
  `display_name` TEXT NOT NULL,
  `team_name` TEXT,
  `avatar_url` TEXT,
  `is_active` INTEGER DEFAULT 1 NOT NULL,
  `created_at` TEXT NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE NO ACTION ON DELETE RESTRICT,
  FOREIGN KEY (`league_id`) REFERENCES `league`(`id`) ON UPDATE NO ACTION ON DELETE RESTRICT
);
CREATE UNIQUE INDEX IF NOT EXISTS `idx_manager_user_id_unique` ON `manager` (`user_id`);
CREATE INDEX IF NOT EXISTS `idx_manager_league_id` ON `manager` (`league_id`);

CREATE TABLE IF NOT EXISTS `card_definition` (
  `id` TEXT PRIMARY KEY NOT NULL,
  `slug` TEXT NOT NULL,
  `name` TEXT NOT NULL,
  `nickname` TEXT NOT NULL,
  `description` TEXT NOT NULL,
  `usage_rules` TEXT NOT NULL,
  `rarity` TEXT NOT NULL,
  `target_type` TEXT NOT NULL,
  `default_copies` INTEGER NOT NULL,
  `image_url` TEXT NOT NULL,
  `whatsapp_template` TEXT NOT NULL,
  `is_enabled` INTEGER DEFAULT 1 NOT NULL,
  `created_at` TEXT NOT NULL,
  CONSTRAINT `chk_card_definition_copies_positive` CHECK (`default_copies` >= 1)
);
CREATE UNIQUE INDEX IF NOT EXISTS `idx_card_definition_slug_unique` ON `card_definition` (`slug`);
CREATE INDEX IF NOT EXISTS `idx_card_definition_rarity` ON `card_definition` (`rarity`);

CREATE TABLE IF NOT EXISTS `distribution_batch` (
  `id` TEXT PRIMARY KEY NOT NULL,
  `season_id` TEXT NOT NULL,
  `week_key` TEXT NOT NULL,
  `trigger_source` TEXT NOT NULL,
  `triggered_by_user_id` TEXT,
  `distributed_count` INTEGER NOT NULL,
  `skipped_full_hand_count` INTEGER NOT NULL,
  `created_at` TEXT NOT NULL,
  FOREIGN KEY (`season_id`) REFERENCES `season`(`id`) ON UPDATE NO ACTION ON DELETE RESTRICT,
  FOREIGN KEY (`triggered_by_user_id`) REFERENCES `user`(`id`) ON UPDATE NO ACTION ON DELETE RESTRICT
);
CREATE UNIQUE INDEX IF NOT EXISTS `idx_distribution_season_week` ON `distribution_batch` (`season_id`, `week_key`);
CREATE INDEX IF NOT EXISTS `idx_distribution_season_created` ON `distribution_batch` (`season_id`, `created_at`);

CREATE TABLE IF NOT EXISTS `card_copy` (
  `id` TEXT PRIMARY KEY NOT NULL,
  `season_id` TEXT NOT NULL,
  `card_definition_id` TEXT NOT NULL,
  `current_manager_id` TEXT,
  `location` TEXT NOT NULL,
  `created_at` TEXT NOT NULL,
  FOREIGN KEY (`season_id`) REFERENCES `season`(`id`) ON UPDATE NO ACTION ON DELETE RESTRICT,
  FOREIGN KEY (`card_definition_id`) REFERENCES `card_definition`(`id`) ON UPDATE NO ACTION ON DELETE RESTRICT,
  FOREIGN KEY (`current_manager_id`) REFERENCES `manager`(`id`) ON UPDATE NO ACTION ON DELETE RESTRICT,
  CONSTRAINT `chk_card_copy_location_owner` CHECK ((`location` = 'DECK' AND `current_manager_id` IS NULL) OR (`location` = 'HAND' AND `current_manager_id` IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS `idx_card_copy_season_location` ON `card_copy` (`season_id`, `location`);
CREATE INDEX IF NOT EXISTS `idx_card_copy_manager_location` ON `card_copy` (`current_manager_id`, `location`);

CREATE TABLE IF NOT EXISTS `card_movement` (
  `id` TEXT PRIMARY KEY NOT NULL,
  `season_id` TEXT NOT NULL,
  `card_copy_id` TEXT NOT NULL,
  `manager_id` TEXT NOT NULL,
  `actor_user_id` TEXT,
  `movement_type` TEXT NOT NULL,
  `from_location` TEXT NOT NULL,
  `to_location` TEXT NOT NULL,
  `target_manager_id` TEXT,
  `target_label` TEXT,
  `whatsapp_message` TEXT,
  `distribution_batch_id` TEXT,
  `related_movement_id` TEXT,
  `notes` TEXT,
  `created_at` TEXT NOT NULL,
  FOREIGN KEY (`season_id`) REFERENCES `season`(`id`) ON UPDATE NO ACTION ON DELETE RESTRICT,
  FOREIGN KEY (`card_copy_id`) REFERENCES `card_copy`(`id`) ON UPDATE NO ACTION ON DELETE RESTRICT,
  FOREIGN KEY (`manager_id`) REFERENCES `manager`(`id`) ON UPDATE NO ACTION ON DELETE RESTRICT,
  FOREIGN KEY (`actor_user_id`) REFERENCES `user`(`id`) ON UPDATE NO ACTION ON DELETE RESTRICT,
  FOREIGN KEY (`target_manager_id`) REFERENCES `manager`(`id`) ON UPDATE NO ACTION ON DELETE RESTRICT,
  FOREIGN KEY (`distribution_batch_id`) REFERENCES `distribution_batch`(`id`) ON UPDATE NO ACTION ON DELETE RESTRICT,
  FOREIGN KEY (`related_movement_id`) REFERENCES `card_movement`(`id`) ON UPDATE NO ACTION ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS `idx_card_movement_season_type_created` ON `card_movement` (`season_id`, `movement_type`, `created_at`);
CREATE INDEX IF NOT EXISTS `idx_card_movement_manager_created` ON `card_movement` (`manager_id`, `created_at`);
CREATE INDEX IF NOT EXISTS `idx_card_movement_card_copy` ON `card_movement` (`card_copy_id`);
CREATE UNIQUE INDEX IF NOT EXISTS `idx_movement_unique_return` ON `card_movement` (`related_movement_id`) WHERE `movement_type` = 'RETURNED' AND `related_movement_id` IS NOT NULL;

CREATE TABLE IF NOT EXISTS `notification` (
  `id` TEXT PRIMARY KEY NOT NULL,
  `manager_id` TEXT NOT NULL,
  `notification_type` TEXT NOT NULL,
  `title` TEXT NOT NULL,
  `message` TEXT NOT NULL,
  `related_movement_id` TEXT,
  `is_read` INTEGER DEFAULT 0 NOT NULL,
  `read_at` TEXT,
  `created_at` TEXT NOT NULL,
  FOREIGN KEY (`manager_id`) REFERENCES `manager`(`id`) ON UPDATE NO ACTION ON DELETE RESTRICT,
  FOREIGN KEY (`related_movement_id`) REFERENCES `card_movement`(`id`) ON UPDATE NO ACTION ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS `idx_notification_manager_unread_created` ON `notification` (`manager_id`, `is_read`, `created_at`);
