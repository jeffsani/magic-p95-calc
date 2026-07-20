-- Migration: per-account tunnel region tags for per-region P95 analytics
CREATE TABLE IF NOT EXISTS tunnel_region_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_tag TEXT NOT NULL,
  tunnel_name TEXT NOT NULL,
  region_code TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(account_tag, tunnel_name)
);
