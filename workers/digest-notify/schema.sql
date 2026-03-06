-- Digest notification subscriptions
-- Initialize with: wrangler d1 execute digest-subscriptions --file=./schema.sql

CREATE TABLE IF NOT EXISTS subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'daily' CHECK(frequency IN ('daily', 'monthly')),
  categories TEXT NOT NULL DEFAULT '[]',
  active INTEGER NOT NULL DEFAULT 0,
  confirm_token TEXT UNIQUE,
  unsubscribe_token TEXT UNIQUE,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_subs_active ON subscriptions(active, frequency);
CREATE INDEX IF NOT EXISTS idx_subs_confirm ON subscriptions(confirm_token);
CREATE INDEX IF NOT EXISTS idx_subs_unsub ON subscriptions(unsubscribe_token);
