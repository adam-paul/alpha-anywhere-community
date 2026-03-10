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

// LWAI proxy response format
export interface GatingResponse {
  email: string;
  weekly_active_minutes: number;
  threshold: number;
  eligible: boolean;
}

export interface UserContext {
  id: string;
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
}

export interface CreateArcadeStoreOptions {
  games?: Game[];
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

export interface ChatState {
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  activeConversationId: string | null;
  searchQuery: string;
  composeText: string;
  isDetailsPanelOpen: boolean;
  isNewChatModalOpen: boolean;
  readonly filteredConversations: Conversation[];
  readonly activeConversation: Conversation | null;
  readonly activeMessages: Message[];
  readonly activeParticipants: Student[];
  selectConversation(id: string): void;
  sendMessage(text: string): void;
  toggleDetailsPanel(): void;
  openNewChatModal(): void;
  closeNewChatModal(): void;
  createConversation(participantIds: string[]): string;
}

// Chat types
export interface Message {
  id: string;
  conversationId: string;
  senderId: string; // 'me' for current user, or student ID
  content: string;
  imageUrl?: string;
  timestamp: Date;
  reactions?: string[];
}

export interface Conversation {
  id: string;
  name?: string; // Custom name for groups, undefined for 1:1
  participantIds: string[]; // Student IDs (not including current user)
  lastMessage?: {
    content: string;
    senderId: string;
    timestamp: Date;
  };
  unreadCount: number;
  isMuted: boolean;
}
