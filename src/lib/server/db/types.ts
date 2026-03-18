/**
 * Database Types
 *
 * TypeScript interfaces matching the D1 schema.
 */

// =============================================================================
// Core Tables
// =============================================================================

export interface DbUser {
  id: string;
  timeback_id: string;
  email: string;
  display_name: string;
  role: 'student' | 'admin';
  created_at: string;
  updated_at: string;
  gating_source: 'lwai' | 'timeback' | null;
  gating_source_probed_at: string | null;
}

export interface DbProfile {
  user_id: string;
  bio: string | null;
  location: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  interests: string | null; // JSON array string
  updated_at: string;
}

export interface DbFriendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  created_at: string;
  updated_at: string;
}

export interface DbConversation {
  id: string;
  name: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbConversationParticipant {
  conversation_id: string;
  user_id: string;
  joined_at: string;
  last_read_at: string | null;
}

export interface DbMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  image_url: string | null;
  moderation_status: 'clean' | 'flagged' | 'reviewed' | 'removed';
  moderation_flags: string | null; // JSON array string
  moderation_notes: string | null;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
}

export interface DbGame {
  id: string;
  title: string;
  thumbnail_url: string | null;
  type: 'roblox' | 'minecraft' | 'web' | 'iframe';
  engagement_category: 'side-by-side' | 'town-square' | 'ice-breaker' | 'trust-builder' | 'rivalry';
  launch_url: string;
  place_id: string | null; // Roblox place ID for deep links
  private_server_access_code: string | null; // UUID access code for private servers
  link_code: string | null; // Link code for private server deep links
  description: string | null;
  is_active: number; // SQLite stores booleans as 0/1
  created_at: string;
  updated_at: string;
}

// =============================================================================
// Joined/Computed Types
// =============================================================================

export interface UserWithProfile extends DbUser {
  profile: DbProfile;
}

// =============================================================================
// Input Types (for inserts/updates)
// =============================================================================

export interface CreateUserInput {
  timeback_id: string;
  email: string;
  display_name: string;
}

export interface UpdateProfileInput {
  bio?: string | null;
  location?: string | null;
  avatar_url?: string | null;
  cover_url?: string | null;
  interests?: string[]; // Will be JSON stringified
}

export interface CreateMessageInput {
  conversation_id: string;
  sender_id: string;
  content: string;
  image_url?: string | null;
}

export interface CreateGameInput {
  id: string;
  title: string;
  type: DbGame['type'];
  engagement_category: DbGame['engagement_category'];
  launch_url: string;
  thumbnail_url?: string | null;
  place_id?: string | null;
  private_server_access_code?: string | null;
  link_code?: string | null;
  description?: string | null;
  is_active?: number;
}

export interface UpdateGameInput {
  title?: string;
  type?: DbGame['type'];
  engagement_category?: DbGame['engagement_category'];
  launch_url?: string;
  thumbnail_url?: string | null;
  place_id?: string | null;
  private_server_access_code?: string | null;
  link_code?: string | null;
  description?: string | null;
  is_active?: number;
}
