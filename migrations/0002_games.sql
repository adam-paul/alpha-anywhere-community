-- Alpha Community: Games Catalog
--
-- This migration creates the games table for the arcade feature.
-- Roblox games require placeId, accessCode, and linkCode for private server deep links.
-- Deep link format: roblox://placeId={id}&accessCode={uuid}&linkCode={code}

CREATE TABLE games (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  title TEXT NOT NULL,
  thumbnail_url TEXT,
  type TEXT NOT NULL CHECK (type IN ('roblox', 'minecraft', 'web', 'iframe')),
  engagement_category TEXT NOT NULL CHECK (engagement_category IN ('side-by-side', 'town-square', 'ice-breaker', 'trust-builder', 'rivalry')),
  launch_url TEXT NOT NULL,
  place_id TEXT,  -- Roblox place ID
  private_server_access_code TEXT,  -- UUID access code for private servers
  link_code TEXT,  -- Link code for private server deep links
  description TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_games_type ON games(type);
CREATE INDEX idx_games_category ON games(engagement_category);
CREATE INDEX idx_games_active ON games(is_active) WHERE is_active = 1;
