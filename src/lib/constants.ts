/**
 * Constants and metadata for domain types.
 *
 * Runtime values that provide labels, colors, and other metadata
 * for types defined in types.ts.
 */

import type { EngagementCategory, GatingSource, Interest, LinkablePlatform } from '$lib/types';

export const TIMEBACK_DAILY_XP_REQUIRED = 120;

// Linkable external platforms for the profile Linked Accounts section.
// `available: false` renders as a greyed-out "Coming soon" placeholder.
// Order here is the display order on the profile page.
export const LINKABLE_PLATFORMS: ReadonlyArray<{
  id: LinkablePlatform;
  label: string;
  available: boolean;
}> = [
  { id: 'roblox', label: 'Roblox', available: true },
  { id: 'minecraft', label: 'Minecraft', available: false },
  { id: 'factorio', label: 'Factorio', available: false }
];

export const GATING_UNIT_LABELS: Record<GatingSource, string> = {
  lwai: 'min',
  timeback: 'XP'
};

// Engagement category metadata
export const ENGAGEMENT_CATEGORIES: Record<
  EngagementCategory,
  {
    label: string;
    description: string;
    rung: number;
  }
> = {
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
  rivalry: {
    label: 'Rivalry',
    description: 'Team vs team competition',
    rung: 5
  }
};

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
