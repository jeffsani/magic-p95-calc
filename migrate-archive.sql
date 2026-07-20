-- Archive index: tracks which weekly periods have been archived to R2
CREATE TABLE IF NOT EXISTS archive_index (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_tag TEXT NOT NULL,
  week_start TEXT NOT NULL,
  week_end TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'both',
  tunnel_count INTEGER NOT NULL DEFAULT 0,
  data_points INTEGER NOT NULL DEFAULT 0,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(account_tag, week_start, direction)
);

CREATE INDEX IF NOT EXISTS idx_archive_index_account ON archive_index(account_tag);
CREATE INDEX IF NOT EXISTS idx_archive_index_range ON archive_index(account_tag, week_start, week_end);

-- Archive settings: per-user global archiving preferences
CREATE TABLE IF NOT EXISTS archive_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_email TEXT NOT NULL UNIQUE,
  archiving_enabled INTEGER NOT NULL DEFAULT 0,
  retention_months INTEGER NOT NULL DEFAULT 12,
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Add archive opt-out column to user_settings
ALTER TABLE user_settings ADD COLUMN archive_opt_out INTEGER NOT NULL DEFAULT 0;
