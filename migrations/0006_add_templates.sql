CREATE TABLE templates (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  exercises TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
