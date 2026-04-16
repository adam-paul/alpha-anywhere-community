import type { ChannelMessage } from '@alpha/shared/types';

// Navigation
export interface NavItem {
  href: string;
  label: string;
  icon: 'search' | 'chat' | 'gamepad';
}

// User types
export type UserRole = 'student' | 'admin';

// Game types
export type GameType = 'roblox' | 'minecraft' | 'web' | 'iframe';

export type EngagementCategory =
  | 'side-by-side'
  | 'town-square'
  | 'ice-breaker'
  | 'trust-builder'
  | 'rivalry';

export type EngagementFilter = EngagementCategory | 'all';

export type GatingMode = 'daily' | 'weekly';

export type GatingSource = 'lwai' | 'timeback';

export type Theme = 'cel-shaded' | 'pixel' | 'roblox-3d';

// Core interfaces
export interface Game {
  id: string;
  title: string;
  thumbnailUrl: string;
  type: GameType;
  engagementCategory: EngagementCategory;
  description?: string;
  isActive?: boolean;
  // For Roblox private servers
  placeId?: string;
  accessCode?: string;
  linkCode?: string;
  // For web/iframe games
  launchUrl?: string;
}

// Discriminated union - each game type requires exactly the fields it needs
export type LaunchOptions =
  | { type: 'roblox'; gameId: string; placeId: string; accessCode: string; linkCode: string }
  | { type: 'web'; gameId: string; launchUrl: string }
  | { type: 'minecraft'; gameId: string; launchUrl: string }
  | { type: 'iframe'; gameId: string; launchUrl?: string };

export interface LaunchResult {
  success: boolean;
  method: 'protocol' | 'web' | 'iframe';
  error?: string;
}

export interface GatingState {
  mode: GatingMode;
  isUnlocked: boolean;
  progressCurrent: number;
  progressRequired: number;
  source?: GatingSource;
}

export interface UserContext {
  id: string; // D1 internal ID (primary key in users table)
  timebackId: string; // Timeback OneRoster sourcedId (external)
  email: string;
  displayName: string;
  role: UserRole;
  avatarUrl?: string;
}

// Interest types for student profiles
export type Interest =
  | 'robotics'
  | 'painting'
  | 'music'
  | 'art'
  | 'piano'
  | 'theatre'
  | 'dance'
  | 'guitar'
  | 'hiking'
  | 'documentaries'
  | 'dinosaurs'
  | 'gaming'
  | 'basketball'
  | 'science'
  | 'geography'
  | 'astronomy'
  | 'drama'
  | 'books'
  | 'movies'
  | 'cooking'
  | 'baking'
  | 'tennis'
  | 'drawing';

// Profile header display data (subset of Student used by ProfileHeader)
export interface ProfileStudent {
  displayName: string;
  handle: string;
  avatarUrl?: string;
  coverUrl?: string;
  location: string;
  joinedDate: string;
}

// Friendship status for profile button state
export type FriendshipStatus =
  | { kind: 'none' }
  | { kind: 'pending-sent'; friendshipId: string }
  | { kind: 'pending-received'; friendshipId: string }
  | { kind: 'friends'; friendshipId: string }
  | { kind: 'self' };

// Profile edit state
export type EditMode = 'view' | 'editing' | 'saving';

// Free-text profile fields that go through moderation before persist.
export type ProfileField = 'bio' | 'location';

// Friend list items (used by profile page for friends, mutual friends, pending requests)
export interface FriendSummary {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface PendingFriendRequest extends FriendSummary {
  friendshipId: string;
}

// Notification types
export type NotificationType =
  | 'friend_request_received'
  | 'friend_request_accepted'
  | 'voice_call_started'
  | 'conversation_created';

export interface Notification {
  id: string;
  type: NotificationType;
  actorId: string;
  actorDisplayName: string;
  actorAvatarUrl: string | null;
  referenceId: string | null;
  read: boolean;
  createdAt: string;
}

export interface NotificationStore {
  readonly notifications: Notification[];
  readonly unreadCount: number;
  readonly isOpen: boolean;
  open(): void;
  close(): void;
  toggle(): void;
  markAsRead(notificationId: string): Promise<void>;
  markAllAsRead(): Promise<void>;
  refresh(): Promise<void>;
  sendPush(recipientId: string): void;
}

// Student profile
export interface Student {
  id: string;
  displayName: string;
  handle: string;
  avatarUrl?: string;
  coverUrl?: string;
  location: string;
  bio: string;
  interests: Interest[];
  joinedDate: string;
  stats: {
    xpEarned: number;
    timebackHours: number;
    dailyXpCurrent: number;
    dailyXpGoal: number;
  };
  mutualFriendIds: string[];
  socials?: {
    instagram?: string;
    tiktok?: string;
    discord?: string;
  };
}

// Store state types
export type ViewMode = 'grid' | 'map';

export interface ArcadeState {
  activeFilter: EngagementFilter;
  theme: Theme;
  readonly games: Game[];
  readonly filteredGames: Game[];
  readonly robloxLinked: boolean;
  setGames: (games: Game[]) => void;
  setRobloxLinked: (linked: boolean) => void;
}

export interface CreateArcadeStoreOptions {
  games?: Game[];
  robloxLinked?: boolean;
}

export interface ExploreState {
  searchQuery: string;
  activeInterestFilter: Interest | 'all';
  viewMode: ViewMode;
  readonly students: Student[];
  readonly filteredStudents: Student[];
}

export interface UserState {
  user: UserContext | null;
  isAuthenticated: boolean;
  setUser: (user: UserContext | null) => void;
  logout: () => void;
}

export interface GatingStore {
  readonly isLoading: boolean;
  readonly hasError: boolean;
  readonly serverData: GatingState | null;
  readonly activeData: GatingState | null;
  readonly showWorkWall: boolean;
  readonly progressPercent: number;
  readonly isGoalComplete: boolean;
  dismiss: () => void;
  setDevOverride: (override: GatingState | null) => void;
}

// Internal loading state for gating store
export type GatingLoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; data: GatingState; dismissed: boolean };

// Chat types

export interface ChatParticipant {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  handle: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  imageUrl?: string;
  timestamp: Date;
  /**
   * Local-only send state. 'pending' = optimistic-inserted, server confirmation
   * outstanding (rendered greyed with a spinner). 'sent' = confirmed by server
   * or received from realtime. Undefined is treated as 'sent' for backwards
   * compatibility with messages loaded from the API.
   */
  status?: 'pending' | 'sent';
}

export interface Conversation {
  id: string;
  name?: string;
  participants: ChatParticipant[];
  lastMessage?: {
    content: string;
    senderId: string;
    timestamp: Date;
  };
  unreadCount: number;
}

export interface CreateChatStoreOptions {
  conversations: Conversation[];
  currentUserId: string;
  friends: ChatParticipant[];
  /** Global realtime store (presence:global) used for chat:unread signaling. */
  realtime: RealtimeStore;
}

export type MessageLoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'loaded' };

/** Transient send-failure surface — cleared on next composer keystroke. */
export interface ChatSendError {
  category: string; // free-form for now; domain type lives in @alpha/evals
  message: string;
}

export interface ChatState {
  readonly conversations: Conversation[];
  readonly activeConversationId: string | null;
  readonly currentUserId: string;
  readonly friends: ChatParticipant[];
  readonly messageLoadState: MessageLoadState;
  readonly sendError: ChatSendError | null;
  /**
   * Total unread messages across all conversations. Derived sum of
   * `conversations[].unreadCount`; the sidebar badge reads this directly.
   */
  readonly chatUnreadCount: number;
  searchQuery: string;
  composeText: string;
  isDetailsPanelOpen: boolean;
  isNewChatModalOpen: boolean;
  readonly filteredConversations: Conversation[];
  readonly activeConversation: Conversation | null;
  readonly activeMessages: Message[];
  readonly activeParticipants: ChatParticipant[];
  selectConversation(id: string): void;
  clearActive(): void;
  sendMessage(text: string): Promise<void>;
  toggleDetailsPanel(): void;
  openNewChatModal(): void;
  closeNewChatModal(): void;
  createConversation(participantIds: string[]): Promise<string>;
  handleIncomingMessage(msg: Message): void;
  setRealtimeSend(fn: ((msg: object) => void) | null): void;
}

// Admin: Game form
export type GameFormStatus = 'idle' | 'looking-up' | 'saving' | 'confirm-delete';
export type GameFormMode = { kind: 'create' } | { kind: 'edit'; gameId: string };

export interface GameFormData {
  title: string;
  type: GameType;
  engagementCategory: EngagementCategory;
  description: string;
  thumbnailUrl: string;
  launchUrl: string;
  placeId: string;
  accessCode: string;
  linkCode: string;
  isActive: boolean;
}

export interface RobloxLookupResult {
  title: string;
  description: string;
  thumbnailUrl: string;
  placeId: string;
  launchUrl: string;
}

// Roblox user lookup (for account linking)
export type RobloxLinkStatus = 'idle' | 'looking-up' | 'confirming' | 'linking' | 'error';

export interface RobloxUserLookupResult {
  robloxUserId: string;
  robloxUsername: string;
  robloxDisplayName: string;
  robloxAvatarUrl: string;
}

// Per-user KV record written on "Enter Game" click. Key: `presence:user:{userId}`.
// Used by the game-presence endpoint to look up who has recently launched a game
// and reconcile their Roblox-side presence.
export interface PresenceRecord {
  gameId: string;
  robloxUserId: string;
}

/** Response from GET /api/arcade/game-presence?gameId=X — scoped to a single game. */
export interface GamePresenceResponse {
  inGameCount: number;
  currentUserInGame: boolean;
}

/**
 * Ephemeral lobby chat message held in component state. Not persisted to D1.
 * No messageId needed — messages have no server-side identity.
 */
export interface LobbyMessage {
  senderId: string;
  senderDisplayName: string;
  content: string;
  timestamp: number;
  /** Local-only send state while POST /api/lobby/[gameId]/message is in flight. */
  status?: 'pending' | 'sent';
  /** Transient local ID for $state reactivity during optimistic sends. */
  localId: string;
}

// Roblox API response shapes (external API typing)
export interface RobloxUserResponse {
  data: Array<{
    id: number;
    name: string;
    displayName: string;
    hasVerifiedBadge: boolean;
  }>;
}

export interface RobloxThumbnailResponse {
  data: Array<{
    targetId: number;
    state: string;
    imageUrl: string;
  }>;
}

export interface RobloxPresenceResponse {
  userPresences: Array<{
    userPresenceType: number;
    userId: number;
  }>;
}

// Presence

export interface PresenceUser {
  userId: string;
  displayName: string;
  /** Game lobby the user is currently viewing, or null. Updated by lobby:state broadcasts. */
  currentLobby: string | null;
}

export interface PresenceStore {
  readonly onlineUsers: ReadonlyMap<string, PresenceUser>;
  readonly onlineCount: number;
  isOnline(userId: string): boolean;
  /** Send lobby:enter or lobby:leave on the presence socket. null = leave. */
  setCurrentLobby(lobbyId: string | null): void;
}

// Realtime (client-side only — shared protocol types re-exported above)

/** Client-side WebSocket connection state. */
export type RealtimeConnectionState =
  | { status: 'disconnected' }
  | { status: 'connecting' }
  | { status: 'connected' }
  | { status: 'reconnecting'; attempt: number }
  | { status: 'failed'; reason: string };

/** Public API of the realtime connection store. */
export interface RealtimeStore {
  readonly state: RealtimeConnectionState;
  readonly isConnected: boolean;
  send(message: { type: string; [key: string]: unknown }): void;
  connect(): void;
  disconnect(): void;
  onMessage(handler: (message: ChannelMessage) => void): () => void;
}

// Voice chat

export interface VoiceParticipant {
  identity: string;
  name: string;
  isSpeaking: boolean;
  isMuted: boolean;
}

export type VoiceConnectionState =
  | { status: 'disconnected' }
  | { status: 'connecting'; roomName: string }
  | { status: 'connected'; roomName: string }
  | { status: 'error'; message: string };

export interface VoiceStore {
  readonly state: VoiceConnectionState;
  readonly isConnected: boolean;
  readonly roomName: string | null;
  readonly participants: ReadonlyMap<string, VoiceParticipant>;
  readonly participantCount: number;
  readonly isMuted: boolean;
  readonly localParticipant: VoiceParticipant | null;
  joinRoom(roomName: string): Promise<void>;
  leaveRoom(): void;
  toggleMute(): void;
  /**
   * Arm a window (in ms) during which pagehide will NOT auto-disconnect voice.
   * Used around a Roblox deep-link launch so the OS hand-off isn't misread
   * as a tab close.
   */
  suppressAutoDisconnect(ms: number): void;
}
