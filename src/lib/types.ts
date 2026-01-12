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
  currentPlayers: number;
  launchUrl: string;
  description?: string;
}

export interface GatingState {
  mode: GatingMode;
  isUnlocked: boolean;
  xpCurrent: number;
  xpRequired: number;
}

export interface UserContext {
  id: string;
  displayName: string;
  avatarUrl?: string;
}

export interface WidgetConfig {
  theme: Theme;
  user?: UserContext;
  gatingState: GatingState;
  games: Game[];
}

// Event types for embed communication
export type WidgetEvent =
  | { type: 'launch'; gameId: string; gameType: GameType; launchUrl: string }
  | { type: 'filter'; category: EngagementCategory | 'all' }
  | { type: 'ready' };

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
