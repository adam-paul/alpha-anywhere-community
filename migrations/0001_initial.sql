-- Alpha Community: Initial Schema
--
-- This migration creates the core tables for the community platform:
-- - users: Identity linked to Timeback SSO
-- - profiles: User-controlled profile data
-- - friendships: Social connections between users
-- - conversations: Chat threads (1:1 and group)
-- - conversation_participants: Many-to-many for conversation members
-- - messages: Chat messages with moderation support

-- =============================================================================
-- USERS
-- =============================================================================
-- Core identity table. Links to Timeback via timeback_id (from SSO sub claim).
-- We store our own id to decouple from external systems.

CREATE TABLE users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  timeback_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_users_timeback_id ON users(timeback_id);
CREATE INDEX idx_users_email ON users(email);

-- =============================================================================
-- PROFILES
-- =============================================================================
-- User-controlled profile data. Separate from users for extensibility.
-- 1:1 relationship with users.

CREATE TABLE profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  bio TEXT,
  location TEXT,
  avatar_url TEXT,
  cover_url TEXT,
  interests TEXT,  -- JSON array: ["gaming", "art", "music"]
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- =============================================================================
-- FRIENDSHIPS
-- =============================================================================
-- Directional friend requests. requester sends to addressee.
-- Status: pending -> accepted/declined
-- To find mutual friends, query where status = 'accepted' in both directions.

CREATE TABLE friendships (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  requester_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  addressee_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),

  UNIQUE(requester_id, addressee_id),
  CHECK(requester_id != addressee_id)
);

CREATE INDEX idx_friendships_requester ON friendships(requester_id, status);
CREATE INDEX idx_friendships_addressee ON friendships(addressee_id, status);

-- =============================================================================
-- CONVERSATIONS
-- =============================================================================
-- Chat threads. name is NULL for 1:1 chats, set for group chats.

CREATE TABLE conversations (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- =============================================================================
-- CONVERSATION PARTICIPANTS
-- =============================================================================
-- Many-to-many relationship between users and conversations.

CREATE TABLE conversation_participants (
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_read_at TEXT,  -- For unread message tracking

  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX idx_participants_user ON conversation_participants(user_id);

-- =============================================================================
-- MESSAGES
-- =============================================================================
-- Chat messages with moderation support.
-- moderation_status: clean (default), flagged (by AI), reviewed (by staff)
-- moderation_flags: JSON array of flag types if flagged

CREATE TABLE messages (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  image_url TEXT,
  moderation_status TEXT NOT NULL DEFAULT 'clean' CHECK (moderation_status IN ('clean', 'flagged', 'reviewed', 'removed')),
  moderation_flags TEXT,  -- JSON array: ["harassment", "inappropriate"]
  moderation_notes TEXT,  -- Staff notes after review
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  edited_at TEXT,
  deleted_at TEXT  -- Soft delete
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_moderation ON messages(moderation_status) WHERE moderation_status != 'clean';
