-- Recreate user_settings with new unique constraint
CREATE TABLE IF NOT EXISTS user_settings_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_email TEXT NOT NULL,
  account_tag TEXT NOT NULL DEFAULT '',
  account_label TEXT NOT NULL DEFAULT '',
  api_token TEXT NOT NULL DEFAULT '',
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_email, account_tag)
);

-- Migrate existing data
INSERT OR IGNORE INTO user_settings_new (id, user_email, account_tag, api_token, updated_at)
  SELECT id, user_email, account_tag, api_token, updated_at FROM user_settings;

-- Swap tables
DROP TABLE user_settings;
ALTER TABLE user_settings_new RENAME TO user_settings;
