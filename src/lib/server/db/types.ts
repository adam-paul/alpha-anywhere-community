/**
 * Database Types
 *
 * TypeScript interfaces matching the D1 schema.
 */

import type {
  AvatarSource,
  EngagementCategory,
  FriendshipDbStatus,
  GameType,
  GatingSource,
  NotificationType,
  UserRole
} from '$lib/types';
import type {
  CorpusSet,
  DetectedBy,
  FlaggedCategory,
  ModerationSeverity,
  ModerationSource,
  ModerationStatus,
  ModerationSubcategory
} from '@alpha/evals/types';

// =============================================================================
// Core Tables
// =============================================================================

export interface DbUser {
  id: string;
  timeback_id: string;
  email: string;
  display_name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
  gating_source: GatingSource | null;
  gating_source_probed_at: string | null;
}

export interface DbProfile {
  user_id: string;
  bio: string | null;
  location: string | null;
  avatar_url: string | null;
  avatar_source: AvatarSource | null;
  cover_url: string | null;
  interests: string | null; // JSON array string
  roblox_user_id: string | null;
  roblox_username: string | null;
  roblox_avatar_url: string | null; // Cache of the Thumbnails API response for the strip.
  updated_at: string;
}

export interface DbFriendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendshipDbStatus;
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
  moderation_status: ModerationStatus;
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
  type: GameType;
  engagement_category: EngagementCategory;
  launch_url: string;
  place_id: string | null; // Roblox place ID for deep links
  private_server_access_code: string | null; // UUID access code for private servers
  link_code: string | null; // Link code for private server deep links
  description: string | null;
  is_active: number; // SQLite stores booleans as 0/1
  created_at: string;
  updated_at: string;
}

export interface DbNotification {
  id: string;
  recipient_id: string;
  actor_id: string;
  type: NotificationType;
  reference_id: string | null;
  read_at: string | null;
  created_at: string;
}

// =============================================================================
// Joined/Computed Types
// =============================================================================

export interface UserWithProfile extends DbUser {
  profile: DbProfile;
}

export interface ConversationWithDetails {
  id: string;
  name: string | null;
  participants: Array<{
    userId: string;
    displayName: string;
    avatarUrl: string | null;
    handle: string;
  }>;
  lastMessage: {
    content: string;
    senderId: string;
    createdAt: string;
  } | null;
  unreadCount: number;
}

export interface NotificationWithActor extends DbNotification {
  actor_display_name: string;
  actor_avatar_url: string | null;
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

export interface LinkRobloxInput {
  roblox_user_id: string;
  roblox_username: string;
  roblox_avatar_url: string;
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

export interface CreateNotificationInput {
  recipient_id: string;
  actor_id: string;
  type: DbNotification['type'];
  reference_id?: string;
}

// =============================================================================
// Moderation Events (migration 0008)
// =============================================================================

// The CHECK constraint on moderation_events.detected_by excludes 'none' —
// clean decisions produce no row, so 'none' is never written.
export type PersistedDetectedBy = Exclude<DetectedBy, 'none'>;

export interface DbModerationEvent {
  id: string;
  user_id: string;
  source: ModerationSource;
  category: FlaggedCategory;
  subcategory: ModerationSubcategory;
  severity: ModerationSeverity;
  detected_by: PersistedDetectedBy;
  confidence: number | null;
  flagged_content: string;
  detection_details: string | null; // JSON blob of provider responses
  latency_ms: number | null;
  created_at: string;
  content_expires_at: string;
}

export interface CreateModerationEventInput {
  user_id: string;
  source: ModerationSource;
  category: FlaggedCategory;
  subcategory: ModerationSubcategory;
  severity: ModerationSeverity;
  detected_by: PersistedDetectedBy;
  confidence?: number | null;
  flagged_content: string;
  detection_details?: string | null;
  latency_ms?: number | null;
}

// =============================================================================
// Generation Events + Eval Runs (migration 0009)
// =============================================================================

/** Runtime audit log for every moderation call — clean + flagged. */
export interface DbGenerationEvent {
  id: string;
  user_id_hash: string; // HMAC-SHA256, never a raw user id (COPPA)
  event_type: ModerationSource;
  input_text: string;
  output_data: string | null; // JSON: { gemini, openai, merged }
  success: number; // 0 | 1
  error_message: string | null;
  latency_ms: number | null;
  created_at: string;
  content_expires_at: string;
}

export interface CreateGenerationEventInput {
  user_id_hash: string;
  event_type: ModerationSource;
  input_text: string;
  output_data?: string | null;
  success: boolean;
  error_message?: string | null;
  latency_ms?: number | null;
}

/** Persisted eval harness run — aggregate metrics + constraint status. */
export interface DbEvalRun {
  id: string;
  created_at: string;
  corpus_set: CorpusSet;
  corpus_size: number;
  corpus_hash: string;
  composite_score: number;
  constraints_passed: number; // 0 | 1
  constraint_violations: string | null; // JSON string[]
  metrics: string | null; // JSON MetricsByCategory
  gemini_metrics: string | null;
  openai_metrics: string | null;
  eval_time_s: number | null;
  avg_latency_ms: number | null;
  eval_errors: number;
  triggered_by: 'manual' | 'agent';
  notes: string | null;
}

/** Per-case breakdown within an eval run. */
export interface DbEvalCaseResult {
  id: string;
  run_id: string;
  case_id: string;
  input_text: string;
  expected_flagged: number; // 0 | 1
  category: string;
  subcategory: string | null;
  actual_flagged: number; // 0 | 1
  gemini_flagged: number | null; // null if provider errored
  openai_flagged: number | null;
  merged_flagged: number; // 0 | 1
  detected_by: string | null;
  latency_ms: number | null;
  gemini_error: string | null;
  openai_error: string | null;
}
