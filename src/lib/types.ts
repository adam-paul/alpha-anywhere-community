// Game types
export type GameType = 'roblox' | 'minecraft' | 'web' | 'iframe';

export type EngagementCategory =
  | 'side-by-side'
  | 'town-square'
  | 'ice-breaker'
  | 'trust-builder'
  | 'rivalry';

export type GatingMode = 'daily' | 'weekly';

export type Theme = 'cel-shaded' | 'pixel' | 'roblox-3d';

// Core interfaces
export interface Game {
  id: string;
  title: string;
  thumbnailUrl: string;
  type: GameType;
  engagementCategory: EngagementCategory;
  launchUrl: string;
  privateServerShareCode?: string;  // Required for Roblox games
  description?: string;
  isActive?: boolean;
}

export interface GameLaunchData {
  gameId: string;
  gameType: string;
  launchUrl: string;
  privateServerShareCode?: string;
}

export interface GatingState {
  mode: GatingMode;
  isUnlocked: boolean;
  xpCurrent: number;
  xpRequired: number;
}

export interface UserContext {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  timebackId?: string; // OneRoster sourcedId, populated after M2M lookup
}

// Engagement category metadata
export const ENGAGEMENT_CATEGORIES: Record<EngagementCategory, {
  label: string;
  description: string;
  rung: number;
}> = {
  'side-by-side': {
    label: 'Side-by-Side',
    description: 'Solo play near others, no interaction required',
    rung: 1
  },
  'town-square': {
    label: 'Town Square',
    description: 'Unstructured hangout, optional interaction',
    rung: 2
  },
  'ice-breaker': {
    label: 'Ice Breaker',
    description: 'Short rounds, shared fate with strangers',
    rung: 3
  },
  'trust-builder': {
    label: 'Trust Builder',
    description: 'Cooperative play requiring coordination',
    rung: 4
  },
  'rivalry': {
    label: 'Rivalry',
    description: 'Team vs team competition',
    rung: 5
  }
};

// Helper to compute progress percentage
export function computeProgressPercent(state: GatingState): number {
  if (state.xpRequired <= 0) return 100;
  return Math.min(100, Math.round((state.xpCurrent / state.xpRequired) * 100));
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

// Interest metadata for display
export const INTERESTS: Record<Interest, { label: string; color: string }> = {
  robotics: { label: 'Robotics', color: '#10b981' },
  painting: { label: 'Painting', color: '#f97316' },
  music: { label: 'Music', color: '#8b5cf6' },
  art: { label: 'Art', color: '#ec4899' },
  piano: { label: 'Piano', color: '#6366f1' },
  theatre: { label: 'Theatre', color: '#ef4444' },
  dance: { label: 'Dance', color: '#f472b6' },
  guitar: { label: 'Guitar', color: '#eab308' },
  hiking: { label: 'Hiking', color: '#22c55e' },
  documentaries: { label: 'Documentaries', color: '#0ea5e9' },
  dinosaurs: { label: 'Dinosaurs', color: '#84cc16' },
  gaming: { label: 'Gaming', color: '#a855f7' },
  basketball: { label: 'Basketball', color: '#f97316' },
  science: { label: 'Science', color: '#14b8a6' },
  geography: { label: 'Geography', color: '#3b82f6' },
  astronomy: { label: 'Astronomy', color: '#a855f7' },
  drama: { label: 'Drama', color: '#ef4444' },
  books: { label: 'Books', color: '#6366f1' },
  movies: { label: 'Movies', color: '#f59e0b' },
  cooking: { label: 'Cooking', color: '#f97316' },
  baking: { label: 'Baking', color: '#ec4899' },
  tennis: { label: 'Tennis', color: '#22c55e' },
  drawing: { label: 'Drawing', color: '#f472b6' }
};

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
