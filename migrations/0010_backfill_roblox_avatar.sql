-- Backfill profile avatar_url from roblox_avatar_url for users who linked
-- Roblox before the link flow started mirroring the headshot into the generic
-- avatar column. Only fills rows where no custom avatar is set.

UPDATE profiles
SET avatar_url = roblox_avatar_url,
    updated_at = datetime('now')
WHERE avatar_url IS NULL
  AND roblox_avatar_url IS NOT NULL
  AND roblox_avatar_url != '';
