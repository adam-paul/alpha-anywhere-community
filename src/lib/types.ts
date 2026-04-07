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
  readonly chatUnreadCount: number;
  readonly isOpen: boolean;
  open(): void;
  close(): void;
  toggle(): void;
  markAsRead(notificationId: string): Promise<void>;
  markAllAsRead(): Promise<void>;
  refresh(): Promise<void>;
  sendPush(recipientId: string): void;
  sendChatUnread(recipientId: string): void;
  decrementChatUnread(n: number): void;
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
  activeFilter: EngagementCategory | 'all';
  theme: Theme;
  readonly games: Game[];
  readonly filteredGames: Game[];
  readonly presenceCounts: PresenceCounts;
  readonly robloxLinked: boolean;
  setGames: (games: Game[]) => void;
  setPresenceCounts: (counts: PresenceCounts) => void;
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
}

export type MessageLoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'loaded' };

export interface ChatState {
  readonly conversations: Conversation[];
  readonly activeConversationId: string | null;
  readonly currentUserId: string;
  readonly friends: ChatParticipant[];
  readonly messageLoadState: MessageLoadState;
  searchQuery: string;
  composeText: string;
  isDetailsPanelOpen: boolean;
  isNewChatModalOpen: boolean;
  readonly filteredConversations: Conversation[];
  readonly activeConversation: Conversation | null;
  readonly activeMessages: Message[];
  readonly activeParticipants: ChatParticipant[];
  selectConversation(id: string): void;
  sendMessage(text: string): Promise<void>;
  toggleDetailsPanel(): void;
  openNewChatModal(): void;
  closeNewChatModal(): void;
  createConversation(participantIds: string[]): Promise<string>;
  handleIncomingMessage(msg: Message): void;
  setRealtimeSend(fn: ((msg: object) => void) | null): void;
}

// Admin: Game form
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
export interface RobloxUserLookupResult {
  robloxUserId: string;
  robloxUsername: string;
  robloxDisplayName: string;
  robloxAvatarUrl: string;
}

// Presence counts per game slug
export type PresenceCounts = Record<string, number>;

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
}

export interface PresenceStore {
  readonly onlineUsers: ReadonlyMap<string, PresenceUser>;
  readonly onlineCount: number;
  isOnline(userId: string): boolean;
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
}
