-- Alpha Community: Games Catalog
--
-- This migration creates the games table for the arcade feature.
-- Games are curated by staff and include private server codes for Roblox games.

-- =============================================================================
-- GAMES
-- =============================================================================
-- Curated game catalog. Roblox games require a private_server_share_code.
-- engagement_category maps to the social engagement ladder (side-by-side -> rivalry).

CREATE TABLE games (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  title TEXT NOT NULL,
  thumbnail_url TEXT,
  type TEXT NOT NULL CHECK (type IN ('roblox', 'minecraft', 'web', 'iframe')),
  engagement_category TEXT NOT NULL CHECK (engagement_category IN ('side-by-side', 'town-square', 'ice-breaker', 'trust-builder', 'rivalry')),
  launch_url TEXT NOT NULL,
  private_server_share_code TEXT,  -- Required for Roblox games (hex code from share link)
  description TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,  -- Soft disable without deleting
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_games_type ON games(type);
CREATE INDEX idx_games_category ON games(engagement_category);
CREATE INDEX idx_games_active ON games(is_active) WHERE is_active = 1;
