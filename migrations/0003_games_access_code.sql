-- Update games table to use accessCode format for deep links
--
-- The accessCode (UUID) is the permanent private server authentication token.
-- Combined with placeId, it forms the deep link: roblox://placeId={id}&accessCode={code}

-- Rename share code column to access code
ALTER TABLE games RENAME COLUMN private_server_share_code TO private_server_access_code;

-- Add place_id column for Roblox games (needed for deep link)
ALTER TABLE games ADD COLUMN place_id TEXT;
