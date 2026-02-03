/**
 * Database Client
 *
 * Type-safe wrapper around D1 database operations.
 */

import type { D1Database } from '@cloudflare/workers-types';
import type {
	DbUser,
	DbProfile,
	DbFriendship,
	DbConversation,
	DbMessage,
	DbConversationParticipant,
	DbGame,
	UserWithProfile,
	CreateUserInput,
	UpdateProfileInput,
	CreateMessageInput
} from './types';

/**
 * Create a database client instance.
 *
 * @param db - D1 database binding from platform.env
 * @returns Object with namespaced database methods
 */
export function createDbClient(db: D1Database) {
	return {
		// =========================================================================
		// USERS
		// =========================================================================
		users: {
			/**
			 * Find a user by their Cognito sub (stored in timeback_id field).
			 * Note: timeback_id currently stores Cognito sub, not the real Timeback/OneRoster ID.
			 */
			async findByCognitoSub(cognitoSub: string): Promise<DbUser | null> {
				return db
					.prepare('SELECT * FROM users WHERE timeback_id = ?')
					.bind(cognitoSub)
					.first<DbUser>();
			},

			/**
			 * Find a user by email.
			 */
			async findByEmail(email: string): Promise<DbUser | null> {
				return db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first<DbUser>();
			},

			/**
			 * Find a user by their internal ID.
			 */
			async findById(id: string): Promise<DbUser | null> {
				return db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<DbUser>();
			},

			/**
			 * Create or update a user based on email (stable across Cognito pools).
			 * Used during SSO callback to ensure user exists.
			 *
			 * Note: timeback_id field stores the Cognito sub (pool-specific), not the
			 * real Timeback/OneRoster ID. The real Timeback ID requires an M2M API lookup.
			 */
			async upsert(input: CreateUserInput): Promise<DbUser> {
				// Look up by email first (stable across Cognito pools)
				const existing = await db
					.prepare('SELECT * FROM users WHERE email = ?')
					.bind(input.email)
					.first<DbUser>();

				if (existing) {
					// Update existing user, including their Cognito sub if it changed
					const result = await db
						.prepare(
							`
							UPDATE users SET
								timeback_id = ?,
								display_name = ?,
								updated_at = datetime('now')
							WHERE id = ?
							RETURNING *
						`
						)
						.bind(input.timeback_id, input.display_name, existing.id)
						.first<DbUser>();

					if (!result) throw new Error('Failed to update user');
					return result;
				}

				// Create new user
				const result = await db
					.prepare(
						`
						INSERT INTO users (timeback_id, email, display_name)
						VALUES (?, ?, ?)
						RETURNING *
					`
					)
					.bind(input.timeback_id, input.email, input.display_name)
					.first<DbUser>();

				if (!result) throw new Error('Failed to create user');
				return result;
			},

			/**
			 * Get all users (for explore page). Paginated.
			 */
			async findAll(limit = 50, offset = 0): Promise<DbUser[]> {
				const { results } = await db
					.prepare('SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?')
					.bind(limit, offset)
					.all<DbUser>();
				return results;
			},

			/**
			 * Get all users with their profiles (for explore page). Paginated.
			 */
			async findAllWithProfiles(limit = 50, offset = 0): Promise<UserWithProfile[]> {
				const { results } = await db
					.prepare(
						`
						SELECT
							u.id, u.timeback_id, u.email, u.display_name, u.created_at, u.updated_at,
							p.bio, p.location, p.avatar_url, p.cover_url, p.interests
						FROM users u
						LEFT JOIN profiles p ON u.id = p.user_id
						ORDER BY u.created_at DESC
						LIMIT ? OFFSET ?
						`
					)
					.bind(limit, offset)
					.all();

				// Reshape flat results into nested structure
				return results.map((row: Record<string, unknown>) => ({
					id: row.id as string,
					timeback_id: row.timeback_id as string,
					email: row.email as string,
					display_name: row.display_name as string,
					created_at: row.created_at as string,
					updated_at: row.updated_at as string,
					profile: row.bio !== null || row.location !== null || row.avatar_url !== null
						? {
								user_id: row.id as string,
								bio: row.bio as string | null,
								location: row.location as string | null,
								avatar_url: row.avatar_url as string | null,
								cover_url: row.cover_url as string | null,
								interests: row.interests as string | null,
								updated_at: row.updated_at as string
							}
						: null
				}));
			}
		},

		// =========================================================================
		// PROFILES
		// =========================================================================
		profiles: {
			/**
			 * Get a user's profile.
			 */
			async findByUserId(userId: string): Promise<DbProfile | null> {
				return db.prepare('SELECT * FROM profiles WHERE user_id = ?').bind(userId).first<DbProfile>();
			},

			/**
			 * Create or update a profile.
			 */
			async upsert(userId: string, input: UpdateProfileInput): Promise<DbProfile> {
				const interests = input.interests ? JSON.stringify(input.interests) : null;

				const result = await db
					.prepare(
						`
						INSERT INTO profiles (user_id, bio, location, avatar_url, cover_url, interests)
						VALUES (?, ?, ?, ?, ?, ?)
						ON CONFLICT(user_id) DO UPDATE SET
							bio = COALESCE(excluded.bio, profiles.bio),
							location = COALESCE(excluded.location, profiles.location),
							avatar_url = COALESCE(excluded.avatar_url, profiles.avatar_url),
							cover_url = COALESCE(excluded.cover_url, profiles.cover_url),
							interests = COALESCE(excluded.interests, profiles.interests),
							updated_at = datetime('now')
						RETURNING *
					`
					)
					.bind(
						userId,
						input.bio ?? null,
						input.location ?? null,
						input.avatar_url ?? null,
						input.cover_url ?? null,
						interests
					)
					.first<DbProfile>();

				if (!result) throw new Error('Failed to upsert profile');
				return result;
			}
		},

		// =========================================================================
		// FRIENDSHIPS
		// =========================================================================
		friendships: {
			/**
			 * Send a friend request.
			 */
			async sendRequest(requesterId: string, addresseeId: string): Promise<DbFriendship> {
				const result = await db
					.prepare(
						`
						INSERT INTO friendships (requester_id, addressee_id, status)
						VALUES (?, ?, 'pending')
						RETURNING *
					`
					)
					.bind(requesterId, addresseeId)
					.first<DbFriendship>();

				if (!result) throw new Error('Failed to send friend request');
				return result;
			},

			/**
			 * Accept a friend request.
			 */
			async accept(friendshipId: string): Promise<DbFriendship> {
				const result = await db
					.prepare(
						`
						UPDATE friendships
						SET status = 'accepted', updated_at = datetime('now')
						WHERE id = ? AND status = 'pending'
						RETURNING *
					`
					)
					.bind(friendshipId)
					.first<DbFriendship>();

				if (!result) throw new Error('Friend request not found or already processed');
				return result;
			},

			/**
			 * Get all friends for a user (accepted requests in either direction).
			 */
			async getFriends(userId: string): Promise<DbUser[]> {
				const { results } = await db
					.prepare(
						`
						SELECT u.* FROM users u
						JOIN friendships f ON (
							(f.requester_id = ? AND f.addressee_id = u.id) OR
							(f.addressee_id = ? AND f.requester_id = u.id)
						)
						WHERE f.status = 'accepted'
					`
					)
					.bind(userId, userId)
					.all<DbUser>();
				return results;
			},

			/**
			 * Get pending friend requests received by a user.
			 */
			async getPendingRequests(userId: string): Promise<(DbFriendship & { requester: DbUser })[]> {
				const { results } = await db
					.prepare(
						`
						SELECT f.*,
							u.id as requester_id, u.email as requester_email,
							u.display_name as requester_display_name
						FROM friendships f
						JOIN users u ON f.requester_id = u.id
						WHERE f.addressee_id = ? AND f.status = 'pending'
					`
					)
					.bind(userId)
					.all();
				// Note: This returns a flattened structure, you may want to reshape it
				return results as (DbFriendship & { requester: DbUser })[];
			}
		},

		// =========================================================================
		// CONVERSATIONS
		// =========================================================================
		conversations: {
			/**
			 * Create a new conversation with participants.
			 */
			async create(
				participantIds: string[],
				name?: string | null
			): Promise<DbConversation> {
				// Create conversation
				const conversation = await db
					.prepare(
						`
						INSERT INTO conversations (name)
						VALUES (?)
						RETURNING *
					`
					)
					.bind(name ?? null)
					.first<DbConversation>();

				if (!conversation) throw new Error('Failed to create conversation');

				// Add participants
				const stmt = db.prepare(
					'INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)'
				);
				await db.batch(participantIds.map((userId) => stmt.bind(conversation.id, userId)));

				return conversation;
			},

			/**
			 * Get conversations for a user.
			 */
			async getForUser(userId: string): Promise<DbConversation[]> {
				const { results } = await db
					.prepare(
						`
						SELECT c.* FROM conversations c
						JOIN conversation_participants cp ON c.id = cp.conversation_id
						WHERE cp.user_id = ?
						ORDER BY c.updated_at DESC
					`
					)
					.bind(userId)
					.all<DbConversation>();
				return results;
			},

			/**
			 * Get participants of a conversation.
			 */
			async getParticipants(conversationId: string): Promise<DbUser[]> {
				const { results } = await db
					.prepare(
						`
						SELECT u.* FROM users u
						JOIN conversation_participants cp ON u.id = cp.user_id
						WHERE cp.conversation_id = ?
					`
					)
					.bind(conversationId)
					.all<DbUser>();
				return results;
			},

			/**
			 * Find existing 1:1 conversation between two users.
			 */
			async findDirectConversation(userId1: string, userId2: string): Promise<DbConversation | null> {
				return db
					.prepare(
						`
						SELECT c.* FROM conversations c
						JOIN conversation_participants cp1 ON c.id = cp1.conversation_id AND cp1.user_id = ?
						JOIN conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id = ?
						WHERE c.name IS NULL
						AND (SELECT COUNT(*) FROM conversation_participants WHERE conversation_id = c.id) = 2
					`
					)
					.bind(userId1, userId2)
					.first<DbConversation>();
			}
		},

		// =========================================================================
		// MESSAGES
		// =========================================================================
		messages: {
			/**
			 * Create a new message.
			 */
			async create(input: CreateMessageInput): Promise<DbMessage> {
				const result = await db
					.prepare(
						`
						INSERT INTO messages (conversation_id, sender_id, content, image_url)
						VALUES (?, ?, ?, ?)
						RETURNING *
					`
					)
					.bind(input.conversation_id, input.sender_id, input.content, input.image_url ?? null)
					.first<DbMessage>();

				if (!result) throw new Error('Failed to create message');

				// Update conversation's updated_at
				await db
					.prepare("UPDATE conversations SET updated_at = datetime('now') WHERE id = ?")
					.bind(input.conversation_id)
					.run();

				return result;
			},

			/**
			 * Get messages for a conversation. Paginated, newest first.
			 */
			async getForConversation(
				conversationId: string,
				limit = 50,
				before?: string
			): Promise<DbMessage[]> {
				let query = `
					SELECT * FROM messages
					WHERE conversation_id = ? AND deleted_at IS NULL
				`;
				const params: (string | number)[] = [conversationId];

				if (before) {
					query += ' AND created_at < ?';
					params.push(before);
				}

				query += ' ORDER BY created_at DESC LIMIT ?';
				params.push(limit);

				const stmt = db.prepare(query);
				const { results } = await stmt.bind(...params).all<DbMessage>();
				return results;
			},

			/**
			 * Flag a message for moderation.
			 */
			async flag(messageId: string, flags: string[]): Promise<DbMessage> {
				const result = await db
					.prepare(
						`
						UPDATE messages
						SET moderation_status = 'flagged',
							moderation_flags = ?,
							updated_at = datetime('now')
						WHERE id = ?
						RETURNING *
					`
					)
					.bind(JSON.stringify(flags), messageId)
					.first<DbMessage>();

				if (!result) throw new Error('Message not found');
				return result;
			},

			/**
			 * Soft delete a message.
			 */
			async delete(messageId: string): Promise<void> {
				await db
					.prepare("UPDATE messages SET deleted_at = datetime('now') WHERE id = ?")
					.bind(messageId)
					.run();
			}
		},

		// =========================================================================
		// GAMES
		// =========================================================================
		games: {
			/**
			 * Get all active games.
			 */
			async findAll(): Promise<DbGame[]> {
				const { results } = await db
					.prepare('SELECT * FROM games WHERE is_active = 1 ORDER BY title')
					.all<DbGame>();
				return results;
			},

			/**
			 * Get a game by ID.
			 */
			async findById(id: string): Promise<DbGame | null> {
				return db.prepare('SELECT * FROM games WHERE id = ?').bind(id).first<DbGame>();
			},

			/**
			 * Get games by engagement category.
			 */
			async findByCategory(category: DbGame['engagement_category']): Promise<DbGame[]> {
				const { results } = await db
					.prepare('SELECT * FROM games WHERE is_active = 1 AND engagement_category = ? ORDER BY title')
					.bind(category)
					.all<DbGame>();
				return results;
			}
		}
	};
}

export type DbClient = ReturnType<typeof createDbClient>;
