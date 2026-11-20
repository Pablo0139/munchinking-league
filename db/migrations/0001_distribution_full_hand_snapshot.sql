-- NULL preserves the distinction between an unknown legacy snapshot and an empty one.
ALTER TABLE distribution_batch ADD COLUMN skipped_full_hand_managers TEXT;