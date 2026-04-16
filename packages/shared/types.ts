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
  /** Game lobby the user is currently viewing, or null if not in any lobby. */
  currentLobby: string | null;
}

/**
 * Structural base for all channel messages. Kept as an abstract shape — must
 * NEVER appear directly in a discriminated union, because its wide `type:
 * string` would defeat narrowing for every literal-typed variant sharing the
 * union. Concrete variants override `type` with a specific literal.
 */
export interface BaseMessage {
  type: string;
  timestamp: number;
}

/** System messages emitted by the DO itself. */
export type SystemMessage =
  | { type: 'system:join'; userId: string; displayName: string; timestamp: number }
  | { type: 'system:leave'; userId: string; displayName: string; timestamp: number };

/**
 * Shared shape for application messages that the DO relays — gives them
 * `senderId` + `timestamp` via `BaseMessage`. Same caveat as `BaseMessage`:
 * extend it for concrete variants; do not use it directly as a union member.
 */
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
  users: Array<{ userId: string; displayName: string; currentLobby: string | null }>;
  timestamp: number;
}

/** Client announces they've entered a game lobby. Stored on connection attachment. */
export interface LobbyEnterRequest {
  type: 'lobby:enter';
  lobbyId: string;
}

/** Client announces they've left their current lobby. */
export interface LobbyLeaveRequest {
  type: 'lobby:leave';
}

/** Broadcast when any user's lobby state changes (enter, leave, or disconnect). */
export interface LobbyStateBroadcast {
  type: 'lobby:state';
  userId: string;
  lobbyId: string | null;
  timestamp: number;
}

/** Ephemeral chat message broadcast on a per-lobby channel. */
export interface LobbyChatBroadcast extends ClientMessage {
  type: 'lobby:chat';
  content: string;
  senderDisplayName: string;
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

/**
 * Messages sent by clients to the DO. Every variant has a literal `type`
 * field so discriminated narrowing works cleanly. Clients send these WITHOUT
 * `senderId`/`timestamp`; the DO stamps those on before broadcasting.
 */
export type ClientRequest =
  | PresenceSnapshotRequest
  | LobbyEnterRequest
  | LobbyLeaveRequest
  | ChatBroadcast
  | ChatUnreadSignal
  | NotificationPush
  | VoiceJoinedBroadcast
  | VoiceLeftBroadcast
  | LobbyChatBroadcast;

/** Messages that can arrive on the WebSocket (from DO to client). */
export type ChannelMessage =
  | SystemMessage
  | PresenceSnapshotMessage
  | ChatBroadcast
  | NotificationPush
  | ChatUnreadSignal
  | VoiceJoinedBroadcast
  | VoiceLeftBroadcast
  | LobbyStateBroadcast
  | LobbyChatBroadcast;

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
