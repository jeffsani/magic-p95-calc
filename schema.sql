CREATE TABLE IF NOT EXISTS user_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_email TEXT NOT NULL,
  account_tag TEXT NOT NULL DEFAULT '',
  account_label TEXT NOT NULL DEFAULT '',
  api_token TEXT NOT NULL DEFAULT '',
  is_default INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_email, account_tag)
);

CREATE TABLE IF NOT EXISTS tunnel_region_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_tag TEXT NOT NULL,
  tunnel_name TEXT NOT NULL,
  region_code TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(account_tag, tunnel_name)
);

CREATE TABLE IF NOT EXISTS query_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_email TEXT NOT NULL,
  account_tag TEXT NOT NULL,
  direction TEXT NOT NULL,
  time_start TEXT NOT NULL,
  time_end TEXT NOT NULL,
  filters TEXT,
  p95_ingress_bps REAL,
  p95_egress_bps REAL,
  created_at TEXT DEFAULT (datetime('now'))
);

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

CREATE TABLE IF NOT EXISTS archive_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_email TEXT NOT NULL UNIQUE,
  archiving_enabled INTEGER NOT NULL DEFAULT 0,
  retention_months INTEGER NOT NULL DEFAULT 12,
  updated_at TEXT DEFAULT (datetime('now'))
);
