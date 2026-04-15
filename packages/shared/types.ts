/**
 * Shared types — cross-project contracts.
 *
 * Types defined here are consumed by multiple projects in the monorepo
 * (SvelteKit app, realtime Worker, LWAI proxy). Each type has exactly
 * one home here, eliminating duplication across project boundaries.
 */

// =============================================================================
// Realtime WebSocket Protocol
// =============================================================================

/** Metadata stored per WebSocket connection via serializeAttachment. */
export interface ConnectionMeta {
  userId: string;
  displayName: string;
}

/** Base shape for all channel messages. */
export interface BaseMessage {
  type: string;
  timestamp: number;
}

/** System messages emitted by the DO itself. */
export type SystemMessage =
  | { type: 'system:join'; userId: string; displayName: string; timestamp: number }
  | { type: 'system:leave'; userId: string; displayName: string; timestamp: number };

/** Application messages sent by clients (relayed by DO with senderId stamped). */
export interface ClientMessage extends BaseMessage {
  senderId: string;
}

/** Client request for the current list of online users. */
export interface PresenceSnapshotRequest {
  type: 'presence:snapshot-request';
}

/** Snapshot of currently connected users, sent in response to a snapshot request. */
export interface PresenceSnapshotMessage {
  type: 'presence:snapshot';
  users: Array<{ userId: string; displayName: string }>;
  timestamp: number;
}

/** Chat message relayed by the DO (typed for client-side validation). */
export interface ChatBroadcast {
  type: 'chat:message';
  messageId: string;
  senderId: string;
  content: string;
  timestamp: number;
}

/** Notification push signal relayed by the DO (lightweight ping, no payload). */
export interface NotificationPush extends ClientMessage {
  type: 'notification:push';
  recipientId: string;
}

/**
 * Chat unread signal — tells `recipientId` that a new message has arrived
 * in `conversationId`. The receiver decides whether to bump its unread
 * counter based on whether it's currently viewing that conversation.
 */
export interface ChatUnreadSignal extends ClientMessage {
  type: 'chat:unread';
  recipientId: string;
  conversationId: string;
}

/** Voice state broadcast — user joined a voice room. */
export interface VoiceJoinedBroadcast extends ClientMessage {
  type: 'voice:joined';
  userId: string;
}

/** Voice state broadcast — user left a voice room. */
export interface VoiceLeftBroadcast extends ClientMessage {
  type: 'voice:left';
  userId: string;
}

/** Messages sent by clients to the DO. */
export type ClientRequest = PresenceSnapshotRequest | ClientMessage;

/** Messages that can arrive on the WebSocket (from DO to client). */
export type ChannelMessage =
  | SystemMessage
  | PresenceSnapshotMessage
  | ChatBroadcast
  | NotificationPush
  | ChatUnreadSignal
  | VoiceJoinedBroadcast
  | VoiceLeftBroadcast;

// =============================================================================
// LWAI Gating Protocol
// =============================================================================

/** Response from the LWAI proxy's /gating endpoint. */
export interface GatingResponse {
  email: string;
  weekly_active_minutes: number;
  threshold: number;
  eligible: boolean;
}
