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
