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
  senderId?: string;
}

/** Snapshot of currently connected users, sent to a newly connected client. */
export interface PresenceSnapshotMessage {
  type: 'presence:snapshot';
  users: Array<{ userId: string; displayName: string }>;
  timestamp: number;
}

/** Union of all messages that can arrive on the WebSocket. */
export type ChannelMessage = SystemMessage | PresenceSnapshotMessage | ClientMessage;

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
