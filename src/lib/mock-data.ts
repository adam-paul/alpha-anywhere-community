import type { Game, GatingState, UserContext } from './types';

// Mock games across all engagement categories
export const MOCK_GAMES: Game[] = [
  // Side-by-Side (Rung 1) - Solo play near others
  {
    id: 'bee-swarm',
    title: 'Bee Swarm Simulator',
    thumbnailUrl: '/thumbnails/bee-swarm.svg',
    type: 'roblox',
    engagementCategory: 'side-by-side',
    currentPlayers: 8,
    launchUrl: 'roblox://placeId=1537690962',
    description: 'Build your bee army and collect pollen'
  },
  {
    id: 'adopt-me',
    title: 'Adopt Me!',
    thumbnailUrl: '/thumbnails/adopt-me.svg',
    type: 'roblox',
    engagementCategory: 'side-by-side',
    currentPlayers: 12,
    launchUrl: 'roblox://placeId=920587237',
    description: 'Raise and collect adorable pets'
  },

  // Town Square (Rung 2) - Unstructured hangout
  {
    id: 'brookhaven',
    title: 'Brookhaven',
    thumbnailUrl: '/thumbnails/brookhaven.svg',
    type: 'roblox',
    engagementCategory: 'town-square',
    currentPlayers: 15,
    launchUrl: 'roblox://placeId=4924922222',
    description: 'Live your dream life in a cozy town'
  },
  {
    id: 'bloxburg',
    title: 'Welcome to Bloxburg',
    thumbnailUrl: '/thumbnails/bloxburg.svg',
    type: 'roblox',
    engagementCategory: 'town-square',
    currentPlayers: 6,
    launchUrl: 'roblox://placeId=185655149',
    description: 'Build your dream home and hang out'
  },

  // Ice Breaker (Rung 3) - Short rounds, shared fate
  {
    id: 'natural-disaster',
    title: 'Natural Disaster Survival',
    thumbnailUrl: '/thumbnails/natural-disaster.svg',
    type: 'roblox',
    engagementCategory: 'ice-breaker',
    currentPlayers: 23,
    launchUrl: 'roblox://placeId=189707',
    description: 'Survive earthquakes, floods, and more together'
  },
  {
    id: 'regretevator',
    title: 'Regretevator',
    thumbnailUrl: '/thumbnails/regretevator.svg',
    type: 'roblox',
    engagementCategory: 'ice-breaker',
    currentPlayers: 18,
    launchUrl: 'roblox://placeId=12345678',
    description: 'Ride the elevator of chaos with friends'
  },

  // Trust Builder (Rung 4) - Cooperative play
  {
    id: 'pizza-place',
    title: 'Work at a Pizza Place',
    thumbnailUrl: '/thumbnails/pizza-place.svg',
    type: 'roblox',
    engagementCategory: 'trust-builder',
    currentPlayers: 9,
    launchUrl: 'roblox://placeId=192800',
    description: 'Run a pizza shop as a team'
  },
  {
    id: 'build-boat',
    title: 'Build A Boat For Treasure',
    thumbnailUrl: '/thumbnails/build-boat.svg',
    type: 'roblox',
    engagementCategory: 'trust-builder',
    currentPlayers: 11,
    launchUrl: 'roblox://placeId=537413528',
    description: 'Engineer boats together and find treasure'
  },

  // Rivalry (Rung 5) - Team competition
  {
    id: 'bedwars',
    title: 'BedWars',
    thumbnailUrl: '/thumbnails/bedwars.svg',
    type: 'roblox',
    engagementCategory: 'rivalry',
    currentPlayers: 31,
    launchUrl: 'roblox://placeId=6872265039',
    description: 'Protect your bed, destroy the enemy'
  },
  {
    id: 'arsenal',
    title: 'Arsenal',
    thumbnailUrl: '/thumbnails/arsenal.svg',
    type: 'roblox',
    engagementCategory: 'rivalry',
    currentPlayers: 27,
    launchUrl: 'roblox://placeId=286090429',
    description: 'Fast-paced team shooter action'
  }
];

// Mock user
export const MOCK_USER: UserContext = {
  id: 'user-001',
  displayName: 'Alex T.',
  avatarUrl: '/thumbnails/avatar-placeholder.svg'
};

// Mock gating state - unlocked
export const MOCK_GATING_UNLOCKED: GatingState = {
  mode: 'daily',
  isUnlocked: true,
  xpCurrent: 120,
  xpRequired: 120
};

// Mock gating state - locked (in progress)
export const MOCK_GATING_LOCKED: GatingState = {
  mode: 'daily',
  isUnlocked: false,
  xpCurrent: 45,
  xpRequired: 120
};
