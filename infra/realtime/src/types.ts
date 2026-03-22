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

/** Union of all messages that can arrive on the WebSocket. */
export type ChannelMessage = SystemMessage | ClientMessage;
