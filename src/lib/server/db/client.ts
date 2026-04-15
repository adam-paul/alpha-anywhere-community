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
  DbNotification,
  NotificationWithActor,
  UserWithProfile,
  CreateUserInput,
  UpdateProfileInput,
  CreateMessageInput,
  CreateGameInput,
  UpdateGameInput,
  CreateNotificationInput,
  LinkRobloxInput,
  ConversationWithDetails,
  DbModerationEvent,
  CreateModerationEventInput,
  DbGenerationEvent,
  CreateGenerationEventInput
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
       * Find a user by their Timeback ID (OneRoster sourcedId).
       */
      async findByTimebackId(timebackId: string): Promise<DbUser | null> {
        return db
          .prepare('SELECT * FROM users WHERE timeback_id = ?')
          .bind(timebackId)
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
       */
      async upsert(input: CreateUserInput): Promise<DbUser> {
        // Look up by email first (stable across Cognito pools)
        const existing = await db
          .prepare('SELECT * FROM users WHERE email = ?')
          .bind(input.email)
          .first<DbUser>();

        if (existing) {
          // Update existing user
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
       * Cache the detected gating source for a user.
       */
      async setGatingSource(email: string, source: 'lwai' | 'timeback'): Promise<void> {
        await db
          .prepare(
            `UPDATE users SET gating_source = ?, gating_source_probed_at = datetime('now'), updated_at = datetime('now') WHERE email = ?`
          )
          .bind(source, email)
          .run();
      },

      /**
       * Get all users with their profiles (for explore page). Paginated.
       */
      async findAllWithProfiles(limit = 50, offset = 0): Promise<UserWithProfile[]> {
        const { results } = await db
          .prepare(
            `
						SELECT
							u.id, u.timeback_id, u.email, u.display_name, u.role,
							u.gating_source, u.gating_source_probed_at, u.created_at, u.updated_at,
							p.bio, p.location, p.avatar_url, p.cover_url, p.interests,
							p.roblox_user_id, p.roblox_username, p.roblox_avatar_url
						FROM users u
						LEFT JOIN profiles p ON u.id = p.user_id
						ORDER BY u.created_at DESC
						LIMIT ? OFFSET ?
						`
          )
          .bind(limit, offset)
          .all();

        // Reshape flat results into nested structure
        // Every user has a profile row (created in hooks.server.ts on first auth)
        return results.map((row: Record<string, unknown>) => ({
          id: row.id as string,
          timeback_id: row.timeback_id as string,
          email: row.email as string,
          display_name: row.display_name as string,
          role: (row.role as 'student' | 'admin') ?? 'student',
          created_at: row.created_at as string,
          updated_at: row.updated_at as string,
          gating_source: (row.gating_source as 'lwai' | 'timeback' | null) ?? null,
          gating_source_probed_at: (row.gating_source_probed_at as string | null) ?? null,
          profile: {
            user_id: row.id as string,
            bio: row.bio as string | null,
            location: row.location as string | null,
            avatar_url: row.avatar_url as string | null,
            cover_url: row.cover_url as string | null,
            interests: row.interests as string | null,
            roblox_user_id: row.roblox_user_id as string | null,
            roblox_username: row.roblox_username as string | null,
            roblox_avatar_url: row.roblox_avatar_url as string | null,
            updated_at: row.updated_at as string
          }
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
        return db
          .prepare('SELECT * FROM profiles WHERE user_id = ?')
          .bind(userId)
          .first<DbProfile>();
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
      },

      /** Link a Roblox account to a profile. */
      async linkRoblox(userId: string, input: LinkRobloxInput): Promise<DbProfile> {
        const result = await db
          .prepare(
            `UPDATE profiles SET
              roblox_user_id = ?,
              roblox_username = ?,
              roblox_avatar_url = ?,
              updated_at = datetime('now')
            WHERE user_id = ?
            RETURNING *`
          )
          .bind(input.roblox_user_id, input.roblox_username, input.roblox_avatar_url, userId)
          .first<DbProfile>();

        if (!result) throw new Error('Profile not found');
        return result;
      },

      /** Unlink a Roblox account from a profile. */
      async unlinkRoblox(userId: string): Promise<DbProfile> {
        const result = await db
          .prepare(
            `UPDATE profiles SET
              roblox_user_id = NULL,
              roblox_username = NULL,
              roblox_avatar_url = NULL,
              updated_at = datetime('now')
            WHERE user_id = ?
            RETURNING *`
          )
          .bind(userId)
          .first<DbProfile>();

        if (!result) throw new Error('Profile not found');
        return result;
      }
    },

    // =========================================================================
    // FRIENDSHIPS
    // =========================================================================
    friendships: {
      /**
       * Find a friendship by ID.
       */
      async findById(friendshipId: string): Promise<DbFriendship | null> {
        return db
          .prepare('SELECT * FROM friendships WHERE id = ?')
          .bind(friendshipId)
          .first<DbFriendship>();
      },

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
       * Remove a friendship (decline, cancel, or unfriend). Deletes the row.
       */
      async remove(friendshipId: string): Promise<void> {
        await db.prepare('DELETE FROM friendships WHERE id = ?').bind(friendshipId).run();
      },

      /**
       * Get the friendship row between two users (either direction), or null.
       */
      async getStatus(userId1: string, userId2: string): Promise<DbFriendship | null> {
        return db
          .prepare(
            `
						SELECT * FROM friendships
						WHERE (requester_id = ? AND addressee_id = ?)
						   OR (requester_id = ? AND addressee_id = ?)
					`
          )
          .bind(userId1, userId2, userId2, userId1)
          .first<DbFriendship>();
      },

      /**
       * Get mutual friends between two users (intersection of accepted friend lists).
       */
      async getMutualFriends(userId1: string, userId2: string): Promise<DbUser[]> {
        const { results } = await db
          .prepare(
            `
						SELECT u.* FROM users u
						WHERE u.id IN (
							SELECT CASE WHEN f.requester_id = ? THEN f.addressee_id ELSE f.requester_id END
							FROM friendships f
							WHERE (f.requester_id = ? OR f.addressee_id = ?) AND f.status = 'accepted'
						)
						AND u.id IN (
							SELECT CASE WHEN f.requester_id = ? THEN f.addressee_id ELSE f.requester_id END
							FROM friendships f
							WHERE (f.requester_id = ? OR f.addressee_id = ?) AND f.status = 'accepted'
						)
					`
          )
          .bind(userId1, userId1, userId1, userId2, userId2, userId2)
          .all<DbUser>();
        return results;
      },

      /**
       * Count accepted friendships for a user.
       */
      async getFriendCount(userId: string): Promise<number> {
        const result = await db
          .prepare(
            `
						SELECT COUNT(*) as count FROM friendships
						WHERE (requester_id = ? OR addressee_id = ?) AND status = 'accepted'
					`
          )
          .bind(userId, userId)
          .first<{ count: number }>();
        return result?.count ?? 0;
      },

      /**
       * Get all pending incoming friend requests for a user.
       */
      async getPendingRequests(userId: string): Promise<DbFriendship[]> {
        const { results } = await db
          .prepare(
            `
						SELECT * FROM friendships
						WHERE addressee_id = ? AND status = 'pending'
						ORDER BY created_at DESC
					`
          )
          .bind(userId)
          .all<DbFriendship>();
        return results;
      }
    },

    // =========================================================================
    // CONVERSATIONS
    // =========================================================================
    conversations: {
      /**
       * Create a new conversation with participants.
       */
      async create(participantIds: string[], name?: string | null): Promise<DbConversation> {
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
      async findDirectConversation(
        userId1: string,
        userId2: string
      ): Promise<DbConversation | null> {
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
      },

      /** Mark a conversation as read for a user. */
      async markAsRead(conversationId: string, userId: string): Promise<void> {
        await db
          .prepare(
            `UPDATE conversation_participants SET last_read_at = datetime('now')
             WHERE conversation_id = ? AND user_id = ?`
          )
          .bind(conversationId, userId)
          .run();
      },

      /** Load all conversations for a user with participants, last message, and unread counts. */
      async getWithDetails(userId: string): Promise<ConversationWithDetails[]> {
        // 1. Get user's conversations
        const convResult = await db
          .prepare(
            `SELECT c.id, c.name, c.created_at, c.updated_at
             FROM conversations c
             JOIN conversation_participants cp ON c.id = cp.conversation_id AND cp.user_id = ?
             ORDER BY c.updated_at DESC`
          )
          .bind(userId)
          .all<{ id: string; name: string | null; created_at: string; updated_at: string }>();

        const convIds = convResult.results.map((c) => c.id);
        if (convIds.length === 0) return [];

        const placeholders = convIds.map(() => '?').join(', ');

        // Run remaining queries in batch
        const [participantsResult, lastMessagesResult, unreadResult] = await db.batch([
          // 2. All participants for these conversations
          db
            .prepare(
              `SELECT cp.conversation_id, u.id as user_id, u.display_name,
                      p.avatar_url, u.email
               FROM conversation_participants cp
               JOIN users u ON cp.user_id = u.id
               LEFT JOIN profiles p ON u.id = p.user_id
               WHERE cp.conversation_id IN (${placeholders})`
            )
            .bind(...convIds),

          // 3. Last message per conversation (window function)
          db
            .prepare(
              `SELECT * FROM (
                 SELECT m.conversation_id, m.content, m.sender_id, m.created_at,
                        ROW_NUMBER() OVER (PARTITION BY m.conversation_id ORDER BY m.created_at DESC) as rn
                 FROM messages m
                 WHERE m.conversation_id IN (${placeholders}) AND m.deleted_at IS NULL
               ) WHERE rn = 1`
            )
            .bind(...convIds),

          // 4. Unread counts per conversation
          db
            .prepare(
              `SELECT m.conversation_id, COUNT(*) as unread_count
               FROM messages m
               JOIN conversation_participants cp
                 ON cp.conversation_id = m.conversation_id AND cp.user_id = ?
               WHERE m.conversation_id IN (${placeholders})
                 AND m.sender_id != ?
                 AND m.deleted_at IS NULL
                 AND (cp.last_read_at IS NULL OR m.created_at > cp.last_read_at)
               GROUP BY m.conversation_id`
            )
            .bind(userId, ...convIds, userId)
        ]);

        // Build lookup maps
        type ParticipantRow = {
          conversation_id: string;
          user_id: string;
          display_name: string;
          avatar_url: string | null;
          email: string;
        };
        type LastMessageRow = {
          conversation_id: string;
          content: string;
          sender_id: string;
          created_at: string;
        };
        type UnreadRow = { conversation_id: string; unread_count: number };

        const participantsByConv = new Map<string, ParticipantRow[]>();
        for (const row of participantsResult.results as unknown as ParticipantRow[]) {
          const list = participantsByConv.get(row.conversation_id) ?? [];
          list.push(row);
          participantsByConv.set(row.conversation_id, list);
        }

        const lastMessageByConv = new Map<string, LastMessageRow>();
        for (const row of lastMessagesResult.results as unknown as LastMessageRow[]) {
          lastMessageByConv.set(row.conversation_id, row);
        }

        const unreadByConv = new Map<string, number>();
        for (const row of unreadResult.results as unknown as UnreadRow[]) {
          unreadByConv.set(row.conversation_id, row.unread_count);
        }

        // Assemble results
        return convResult.results.map((conv) => {
          const participants = (participantsByConv.get(conv.id) ?? [])
            .filter((p) => p.user_id !== userId)
            .map((p) => ({
              userId: p.user_id,
              displayName: p.display_name,
              avatarUrl: p.avatar_url,
              handle: p.email.split('@')[0]
            }));

          const lastMsg = lastMessageByConv.get(conv.id);

          return {
            id: conv.id,
            name: conv.name,
            participants,
            lastMessage: lastMsg
              ? {
                  content: lastMsg.content,
                  senderId: lastMsg.sender_id,
                  createdAt: lastMsg.created_at
                }
              : null,
            unreadCount: unreadByConv.get(conv.id) ?? 0
          };
        });
      },

      /**
       * Get total unread message count across all conversations for a user.
       */
      async getTotalUnreadCount(userId: string): Promise<number> {
        const result = await db
          .prepare(
            `
						SELECT COUNT(*) as count FROM messages m
						JOIN conversation_participants cp
							ON cp.conversation_id = m.conversation_id AND cp.user_id = ?
						WHERE m.sender_id != ?
							AND m.deleted_at IS NULL
							AND (cp.last_read_at IS NULL OR m.created_at > cp.last_read_at)
					`
          )
          .bind(userId, userId)
          .first<{ count: number }>();
        return result?.count ?? 0;
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
          .prepare(
            'SELECT * FROM games WHERE is_active = 1 AND engagement_category = ? ORDER BY title'
          )
          .bind(category)
          .all<DbGame>();
        return results;
      },

      /**
       * Get all games including inactive. Admin use only.
       */
      async findAllAdmin(): Promise<DbGame[]> {
        const { results } = await db.prepare('SELECT * FROM games ORDER BY title').all<DbGame>();
        return results;
      },

      /**
       * Create a new game.
       */
      async create(input: CreateGameInput): Promise<DbGame> {
        const result = await db
          .prepare(
            `
						INSERT INTO games (id, title, thumbnail_url, type, engagement_category, launch_url, place_id, private_server_access_code, link_code, description, is_active)
						VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
						RETURNING *
					`
          )
          .bind(
            input.id,
            input.title,
            input.thumbnail_url ?? null,
            input.type,
            input.engagement_category,
            input.launch_url,
            input.place_id ?? null,
            input.private_server_access_code ?? null,
            input.link_code ?? null,
            input.description ?? null,
            input.is_active ?? 1
          )
          .first<DbGame>();

        if (!result) throw new Error('Failed to create game');
        return result;
      },

      /**
       * Update an existing game. Only provided fields are updated.
       */
      async update(id: string, input: UpdateGameInput): Promise<DbGame> {
        const fields: string[] = [];
        const values: (string | number | null)[] = [];

        if (input.title !== undefined) {
          fields.push('title = ?');
          values.push(input.title);
        }
        if (input.type !== undefined) {
          fields.push('type = ?');
          values.push(input.type);
        }
        if (input.engagement_category !== undefined) {
          fields.push('engagement_category = ?');
          values.push(input.engagement_category);
        }
        if (input.launch_url !== undefined) {
          fields.push('launch_url = ?');
          values.push(input.launch_url);
        }
        if (input.thumbnail_url !== undefined) {
          fields.push('thumbnail_url = ?');
          values.push(input.thumbnail_url);
        }
        if (input.place_id !== undefined) {
          fields.push('place_id = ?');
          values.push(input.place_id);
        }
        if (input.private_server_access_code !== undefined) {
          fields.push('private_server_access_code = ?');
          values.push(input.private_server_access_code);
        }
        if (input.link_code !== undefined) {
          fields.push('link_code = ?');
          values.push(input.link_code);
        }
        if (input.description !== undefined) {
          fields.push('description = ?');
          values.push(input.description);
        }
        if (input.is_active !== undefined) {
          fields.push('is_active = ?');
          values.push(input.is_active);
        }

        fields.push("updated_at = datetime('now')");

        const result = await db
          .prepare(`UPDATE games SET ${fields.join(', ')} WHERE id = ? RETURNING *`)
          .bind(...values, id)
          .first<DbGame>();

        if (!result) throw new Error('Game not found');
        return result;
      },

      /**
       * Delete a game.
       */
      async delete(id: string): Promise<void> {
        const { meta } = await db.prepare('DELETE FROM games WHERE id = ?').bind(id).run();
        if (meta.changes === 0) throw new Error('Game not found');
      }
    },

    // =========================================================================
    // NOTIFICATIONS
    // =========================================================================
    notifications: {
      /**
       * Create a notification.
       */
      async create(input: CreateNotificationInput): Promise<DbNotification> {
        const result = await db
          .prepare(
            `
						INSERT INTO notifications (recipient_id, actor_id, type, reference_id)
						VALUES (?, ?, ?, ?)
						RETURNING *
					`
          )
          .bind(input.recipient_id, input.actor_id, input.type, input.reference_id ?? null)
          .first<DbNotification>();

        if (!result) throw new Error('Failed to create notification');
        return result;
      },

      /**
       * Get recent notifications for a user, with actor display info.
       */
      async getForUser(userId: string, limit: number = 20): Promise<NotificationWithActor[]> {
        const { results } = await db
          .prepare(
            `
						SELECT n.*, u.display_name as actor_display_name, p.avatar_url as actor_avatar_url
						FROM notifications n
						JOIN users u ON u.id = n.actor_id
						LEFT JOIN profiles p ON p.user_id = n.actor_id
						WHERE n.recipient_id = ?
						ORDER BY n.created_at DESC
						LIMIT ?
					`
          )
          .bind(userId, limit)
          .all<NotificationWithActor>();
        return results;
      },

      /**
       * Get count of unread notifications for a user.
       */
      async getUnreadCount(userId: string): Promise<number> {
        const result = await db
          .prepare(
            `
						SELECT COUNT(*) as count FROM notifications
						WHERE recipient_id = ? AND read_at IS NULL
					`
          )
          .bind(userId)
          .first<{ count: number }>();
        return result?.count ?? 0;
      },

      /**
       * Mark a single notification as read. Recipient check prevents marking others' notifications.
       */
      async markAsRead(notificationId: string, userId: string): Promise<void> {
        await db
          .prepare(
            `
						UPDATE notifications SET read_at = datetime('now')
						WHERE id = ? AND recipient_id = ? AND read_at IS NULL
					`
          )
          .bind(notificationId, userId)
          .run();
      },

      /**
       * Mark all notifications as read for a user.
       */
      async markAllAsRead(userId: string): Promise<void> {
        await db
          .prepare(
            `
						UPDATE notifications SET read_at = datetime('now')
						WHERE recipient_id = ? AND read_at IS NULL
					`
          )
          .bind(userId)
          .run();
      }
    },

    // =========================================================================
    // MODERATION
    // =========================================================================
    moderation: {
      /**
       * Persist a flagged moderation decision. Clean decisions produce no row.
       */
      async createEvent(input: CreateModerationEventInput): Promise<DbModerationEvent> {
        const result = await db
          .prepare(
            `
							INSERT INTO moderation_events (
								user_id, source, category, subcategory, severity,
								detected_by, confidence, flagged_content, detection_details, latency_ms
							)
							VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
							RETURNING *
						`
          )
          .bind(
            input.user_id,
            input.source,
            input.category,
            input.subcategory,
            input.severity,
            input.detected_by,
            input.confidence ?? null,
            input.flagged_content,
            input.detection_details ?? null,
            input.latency_ms ?? null
          )
          .first<DbModerationEvent>();

        if (!result) throw new Error('Failed to create moderation event');
        return result;
      }
    },

    // =========================================================================
    // EVALS
    // =========================================================================
    evals: {
      /**
       * Log a moderation call to generation_events. Written for every call —
       * clean AND flagged — so the clean path has observability. Callers
       * should fire-and-forget; failures here should not block the request.
       */
      async createGenerationEvent(input: CreateGenerationEventInput): Promise<DbGenerationEvent> {
        const result = await db
          .prepare(
            `
							INSERT INTO generation_events (
								user_id_hash, event_type, input_text,
								output_data, success, error_message, latency_ms
							)
							VALUES (?, ?, ?, ?, ?, ?, ?)
							RETURNING *
						`
          )
          .bind(
            input.user_id_hash,
            input.event_type,
            input.input_text,
            input.output_data ?? null,
            input.success ? 1 : 0,
            input.error_message ?? null,
            input.latency_ms ?? null
          )
          .first<DbGenerationEvent>();

        if (!result) throw new Error('Failed to create generation event');
        return result;
      }
    }
  };
}

export type DbClient = ReturnType<typeof createDbClient>;
