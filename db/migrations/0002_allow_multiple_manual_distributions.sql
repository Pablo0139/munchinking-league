-- Allow multiple manual ADMIN distributions within the same ISO week while keeping
-- automatic CRON distributions idempotent per (season_id, week_key) and ordered lookup fast.
DROP INDEX IF EXISTS `idx_distribution_season_week`;
CREATE UNIQUE INDEX IF NOT EXISTS `idx_distribution_season_week_cron`
  ON `distribution_batch` (`season_id`, `week_key`)
  WHERE `trigger_source` = 'CRON';
CREATE INDEX IF NOT EXISTS `idx_distribution_season_week_created`
  ON `distribution_batch` (`season_id`, `week_key`, `created_at`);
