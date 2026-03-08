-- Add role column to users table.
--
-- Internally managed for now. Future: map from OneRoster roles
-- during login (resolveTimebackId already makes the M2M call,
-- just doesn't capture the role field yet).

ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'student'
  CHECK (role IN ('student', 'admin'));
