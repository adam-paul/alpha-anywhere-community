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
	created_at: string;
	updated_at: string;
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
	status: 'pending' | 'accepted' | 'declined' | 'blocked';
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

// =============================================================================
// Joined/Computed Types
// =============================================================================

export interface UserWithProfile extends DbUser {
	profile: DbProfile | null;
}

export interface ConversationWithParticipants extends DbConversation {
	participants: DbUser[];
	last_message: DbMessage | null;
	unread_count: number;
}

export interface MessageWithSender extends DbMessage {
	sender: DbUser;
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
