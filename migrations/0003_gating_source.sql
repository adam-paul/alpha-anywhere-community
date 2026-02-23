-- Gating Source Detection
--
-- Caches which gating system applies to each student.
-- NULL = unknown (probe on next arcade visit)
-- 'lwai' = confirmed LWAI/CoachBot student (gate on active_minutes)
-- 'timeback' = Timeback-only student (gate on XP when API available)

ALTER TABLE users ADD COLUMN gating_source TEXT CHECK (gating_source IN ('lwai', 'timeback'));
ALTER TABLE users ADD COLUMN gating_source_probed_at TEXT;
