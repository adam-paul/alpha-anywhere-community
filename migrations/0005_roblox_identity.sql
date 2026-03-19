-- Roblox Account Linking
--
-- Stores linked Roblox identity on the profiles table.
-- roblox_user_id is the Roblox numeric user ID (from username lookup API).
-- roblox_username is the canonical username for display.
-- roblox_avatar_url is the headshot thumbnail URL.
-- Partial unique index prevents two students from claiming the same Roblox account.

ALTER TABLE profiles ADD COLUMN roblox_user_id TEXT;
ALTER TABLE profiles ADD COLUMN roblox_username TEXT;
ALTER TABLE profiles ADD COLUMN roblox_avatar_url TEXT;

CREATE UNIQUE INDEX idx_profiles_roblox_user_id
  ON profiles(roblox_user_id) WHERE roblox_user_id IS NOT NULL;
