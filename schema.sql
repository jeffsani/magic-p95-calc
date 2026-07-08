CREATE TABLE IF NOT EXISTS user_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_email TEXT NOT NULL UNIQUE,
  account_tag TEXT NOT NULL DEFAULT '',
  api_token TEXT NOT NULL DEFAULT '',
  updated_at TEXT DEFAULT (datetime('now'))
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
