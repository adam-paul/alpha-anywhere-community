-- Moderation flag events. One row per flagged moderation decision (clean
-- decisions produce no row — they're fire-and-forget). Feeds the admin
-- review queue, audit trail, and the Plan B eval harness's production
-- mining job.
--
-- Retention: flagged_content expires after 90 days (COPPA). A future
-- cron job deletes rows where content_expires_at < datetime('now').

CREATE TABLE moderation_events (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('about_me', 'chat_message')),
  category TEXT NOT NULL CHECK (category IN ('self_harm', 'pii', 'harmful')),
  subcategory TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  detected_by TEXT NOT NULL CHECK (detected_by IN ('gemini', 'openai', 'both')),
  confidence REAL,
  flagged_content TEXT NOT NULL,
  detection_details TEXT,  -- JSON: full provider responses for audit
  latency_ms INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  content_expires_at TEXT NOT NULL DEFAULT (datetime('now', '+90 days'))
);

CREATE INDEX idx_moderation_events_user ON moderation_events(user_id, created_at DESC);
CREATE INDEX idx_moderation_events_expiry ON moderation_events(content_expires_at);
