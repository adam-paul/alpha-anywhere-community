-- Plan B tables: runtime audit log + harness run persistence.
--
--   generation_events    — every moderation call (clean + flagged). Observability
--                          on the clean path; COPPA 90-day content TTL.
--   eval_runs            — one row per `eval:moderation --save` invocation.
--                          Aggregate metrics + constraint status.
--   eval_case_results    — per-case breakdown within a run. Enables drill-down
--                          into misclassifications and per-provider analysis.

-- =============================================================================
-- generation_events
-- =============================================================================
-- Written from src/lib/server/evals.ts on every moderate() call.
-- user_id is HMAC-SHA256 hashed for COPPA (server adapter handles hashing).
-- output_data stores the full provider responses for debugging / mining.

CREATE TABLE generation_events (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id_hash TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('about_me', 'chat_message')),
  input_text TEXT NOT NULL,
  output_data TEXT,                    -- JSON: { gemini, openai, merged }
  success INTEGER NOT NULL,            -- 0/1
  error_message TEXT,
  latency_ms INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  content_expires_at TEXT NOT NULL DEFAULT (datetime('now', '+90 days'))
);

CREATE INDEX idx_generation_events_user ON generation_events(user_id_hash, created_at DESC);
CREATE INDEX idx_generation_events_type ON generation_events(event_type, created_at DESC);
CREATE INDEX idx_generation_events_expiry ON generation_events(content_expires_at);

-- =============================================================================
-- eval_runs
-- =============================================================================
-- Persisted by the CLI harness when --save is passed. Metrics are stored as
-- JSON text; the CLI + any admin UI deserialize at read time.

CREATE TABLE eval_runs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  corpus_set TEXT NOT NULL CHECK (corpus_set IN ('optimize', 'holdout')),
  corpus_size INTEGER NOT NULL,
  corpus_hash TEXT NOT NULL,
  composite_score REAL NOT NULL,
  constraints_passed INTEGER NOT NULL,     -- 0/1
  constraint_violations TEXT,              -- JSON array of strings
  metrics TEXT,                            -- JSON: merged metrics
  gemini_metrics TEXT,                     -- JSON
  openai_metrics TEXT,                     -- JSON
  eval_time_s REAL,
  avg_latency_ms REAL,
  eval_errors INTEGER NOT NULL DEFAULT 0,
  triggered_by TEXT NOT NULL DEFAULT 'manual' CHECK (triggered_by IN ('manual', 'agent')),
  notes TEXT
);

CREATE INDEX idx_eval_runs_created ON eval_runs(created_at DESC);

-- =============================================================================
-- eval_case_results
-- =============================================================================
-- One row per (run, case). ON DELETE CASCADE so deleting a run removes its
-- results. `case_id` is the corpus case string ID, not a FK — the bundled
-- corpus can evolve independently between runs.

CREATE TABLE eval_case_results (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  run_id TEXT NOT NULL REFERENCES eval_runs(id) ON DELETE CASCADE,
  case_id TEXT NOT NULL,
  input_text TEXT NOT NULL,
  expected_flagged INTEGER NOT NULL,       -- 0/1
  category TEXT NOT NULL,
  subcategory TEXT,
  actual_flagged INTEGER NOT NULL,         -- 0/1
  gemini_flagged INTEGER,                  -- 0/1 or NULL if provider errored
  openai_flagged INTEGER,                  -- 0/1 or NULL if provider errored
  merged_flagged INTEGER NOT NULL,         -- 0/1
  detected_by TEXT,
  latency_ms INTEGER,
  gemini_error TEXT,
  openai_error TEXT
);

CREATE INDEX idx_eval_case_results_run ON eval_case_results(run_id, category);
