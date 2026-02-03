-- Add link_code column for Roblox private server deep links
-- The full deep link format requires both accessCode and linkCode:
-- roblox://placeId={id}&accessCode={uuid}&linkCode={code}

ALTER TABLE games ADD COLUMN link_code TEXT;
