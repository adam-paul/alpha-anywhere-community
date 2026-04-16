-- Avatar source selection
--
-- Students will eventually pick between Roblox, AI-generated, and custom
-- uploaded avatars. `avatar_url` is the single column every consumer reads;
-- `avatar_source` is the context scalar for the currently-active URL so
-- link/unlink and future source-switch flows know whether to clear or
-- preserve it.
--
-- `roblox_avatar_url` stays as a write-time cache of the Roblox Thumbnails
-- API response — it powers the "Linked Roblox" strip even when a student
-- picks a non-Roblox avatar. Distinct semantics from avatar_url (cache of
-- a specific identity vs. active display choice), so this is not a mirror.
--
-- Migration 0010 backfilled avatar_url from roblox_avatar_url, so every
-- existing row with avatar_url set is Roblox-sourced.

ALTER TABLE profiles ADD COLUMN avatar_source TEXT
  CHECK (avatar_source IN ('roblox', 'ai', 'custom'));

UPDATE profiles SET avatar_source = 'roblox' WHERE avatar_url IS NOT NULL;
