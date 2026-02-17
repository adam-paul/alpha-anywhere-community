#!/usr/bin/env bun
/**
 * Seed script for the games catalog.
 *
 * Usage:
 *   bun run scripts/seed-games.ts              # Seed local D1
 *   bun run scripts/seed-games.ts --remote     # Seed remote D1
 *   bun run scripts/seed-games.ts --clear      # Clear existing games first
 *
 * This script generates SQL and executes it via wrangler d1.
 * Games are upserted by ID using INSERT OR REPLACE.
 *
 * Private server credentials (access_code, link_code) are included here
 * for games where we have them. TODO: Move credentials to a more secure
 * storage mechanism when we have many games.
 */

import { $ } from 'bun';
import type { GameType, EngagementCategory } from '../src/lib/types';

// =============================================================================
// TYPES
// =============================================================================

interface GameSeed {
  id: string; // Slug-style ID, e.g., 'bee-swarm-simulator'
  title: string;
  description: string;
  thumbnailUrl: string;
  type: GameType;
  engagementCategory: EngagementCategory;
  placeId?: string; // Roblox place ID
  launchUrl: string; // Web fallback URL
  // Private server credentials (only for games where we have them)
  accessCode?: string;
  linkCode?: string;
  // Whether the game appears in the arcade (false = exists in DB but hidden)
  isActive: boolean;
}

// =============================================================================
// GAME CATALOG
// =============================================================================

const GAMES: GameSeed[] = [
  // ---------------------------------------------------------------------------
  // Side-by-Side (Rung 1) - Solo play near others
  // ---------------------------------------------------------------------------
  {
    id: 'bee-swarm-simulator',
    title: 'Bee Swarm Simulator',
    description: 'Grow your own swarm of bees, collect pollen, and make honey.',
    thumbnailUrl:
      'https://tr.rbxcdn.com/180DAY-49ddf4f55e53e2e563fe9541f42ff17d/512/512/Image/Png/noFilter',
    type: 'roblox',
    engagementCategory: 'side-by-side',
    placeId: '1537690962',
    launchUrl: 'https://www.roblox.com/games/1537690962/Bee-Swarm-Simulator',
    accessCode: '365ac2f6-cde8-41b1-82ff-93dafd34258a',
    linkCode: '32872177519509092753493698228788',
    isActive: true
  },
  {
    id: 'adopt-me',
    title: 'Adopt Me!',
    description: 'Adopt and raise cute pets in a colorful world.',
    thumbnailUrl:
      'https://tr.rbxcdn.com/180DAY-2c28f92021d66d85aa1743b6289caafd/512/512/Image/Png/noFilter',
    type: 'roblox',
    engagementCategory: 'side-by-side',
    placeId: '920587237',
    launchUrl: 'https://www.roblox.com/games/920587237/Adopt-Me',
    isActive: false // Needs private server
  },

  // ---------------------------------------------------------------------------
  // Town Square (Rung 2) - Unstructured hangout
  // ---------------------------------------------------------------------------
  {
    id: 'brookhaven',
    title: 'Brookhaven',
    description: 'Roleplay in a vibrant city with houses, cars, and endless possibilities.',
    thumbnailUrl:
      'https://tr.rbxcdn.com/180DAY-41f48dd0839f267b756bb8cd314660cf/512/512/Image/Png/noFilter',
    type: 'roblox',
    engagementCategory: 'town-square',
    placeId: '4924922222',
    launchUrl: 'https://www.roblox.com/games/4924922222/Brookhaven-RP',
    isActive: false // Needs private server
  },
  {
    id: 'welcome-to-bloxburg',
    title: 'Welcome to Bloxburg',
    description: 'Build your dream home and live out your virtual life.',
    thumbnailUrl:
      'https://tr.rbxcdn.com/180DAY-b08698e2e1ba211cf2acf61fec5325b3/512/512/Image/Png/noFilter',
    type: 'roblox',
    engagementCategory: 'town-square',
    placeId: '185655149',
    launchUrl: 'https://www.roblox.com/games/185655149/Welcome-to-Bloxburg',
    isActive: false // Needs private server
  },

  // ---------------------------------------------------------------------------
  // Ice Breaker (Rung 3) - Short rounds, shared fate
  // ---------------------------------------------------------------------------
  {
    id: 'natural-disaster-survival',
    title: 'Natural Disaster Survival',
    description: 'Survive earthquakes, floods, tornadoes, and more with friends.',
    thumbnailUrl:
      'https://tr.rbxcdn.com/180DAY-9b827b2f6927b039ec508bf133bedd9a/512/512/Image/Png/noFilter',
    type: 'roblox',
    engagementCategory: 'ice-breaker',
    placeId: '189707',
    launchUrl: 'https://www.roblox.com/games/189707/Natural-Disaster-Survival',
    isActive: false // Needs private server
  },
  {
    id: 'regretevator',
    title: 'Regretevator',
    description: 'A quirky elevator game with unexpected twists.',
    thumbnailUrl: 'https://t4.rbxcdn.com/180DAY-3acb0f0da8433cb97bb84fe70301c78f',
    type: 'roblox',
    engagementCategory: 'ice-breaker',
    placeId: '11747379489',
    launchUrl: 'https://www.roblox.com/games/11747379489/Regretevator',
    isActive: false // Needs private server
  },

  // ---------------------------------------------------------------------------
  // Trust Builder (Rung 4) - Cooperative play
  // ---------------------------------------------------------------------------
  {
    id: 'work-at-a-pizza-place',
    title: 'Work at a Pizza Place',
    description: 'Team up to run a pizza restaurant and earn coins.',
    thumbnailUrl:
      'https://tr.rbxcdn.com/180DAY-a3f7e1085ae87b4f1329bc319f688efa/512/512/Image/Png/noFilter',
    type: 'roblox',
    engagementCategory: 'trust-builder',
    placeId: '192800',
    launchUrl: 'https://www.roblox.com/games/192800/Work-at-a-Pizza-Place',
    isActive: false // Needs private server
  },
  {
    id: 'build-a-boat',
    title: 'Build A Boat For Treasure',
    description: 'Build a boat and sail through obstacles to find treasure.',
    thumbnailUrl:
      'https://tr.rbxcdn.com/180DAY-2642774e00b871f246810c45f3ec5faf/512/512/Image/Png/noFilter',
    type: 'roblox',
    engagementCategory: 'trust-builder',
    placeId: '537413528',
    launchUrl: 'https://www.roblox.com/games/537413528/Build-A-Boat-For-Treasure',
    isActive: false // Needs private server
  },

  // ---------------------------------------------------------------------------
  // Rivalry (Rung 5) - Team competition
  // ---------------------------------------------------------------------------
  {
    id: 'bedwars',
    title: 'BedWars',
    description: 'Protect your bed and destroy enemy beds to win.',
    thumbnailUrl:
      'https://tr.rbxcdn.com/180DAY-8d015c8ee2bd2a2bb603ccd5eb5ea6a1/512/512/Image/Png/noFilter',
    type: 'roblox',
    engagementCategory: 'rivalry',
    placeId: '6872265039',
    launchUrl: 'https://www.roblox.com/games/6872265039/BedWars',
    isActive: false // Needs private server
  },
  {
    id: 'arsenal',
    title: 'Arsenal',
    description: 'Fast-paced FPS with gun progression gameplay.',
    thumbnailUrl:
      'https://tr.rbxcdn.com/180DAY-2c691f8c1278352cc98e30afef3c3a4e/512/512/Image/Png/noFilter',
    type: 'roblox',
    engagementCategory: 'rivalry',
    placeId: '286090429',
    launchUrl: 'https://www.roblox.com/games/286090429/Arsenal',
    isActive: false // Needs private server
  }
];

// =============================================================================
// SQL GENERATION
// =============================================================================

function escapeSQL(value: string | undefined | null): string {
  if (value === undefined || value === null) return 'NULL';
  // Escape single quotes by doubling them
  return `'${value.replace(/'/g, "''")}'`;
}

function generateInsertSQL(game: GameSeed): string {
  return `INSERT OR REPLACE INTO games (
  id,
  title,
  thumbnail_url,
  type,
  engagement_category,
  launch_url,
  place_id,
  private_server_access_code,
  link_code,
  description,
  is_active,
  created_at,
  updated_at
) VALUES (
  ${escapeSQL(game.id)},
  ${escapeSQL(game.title)},
  ${escapeSQL(game.thumbnailUrl)},
  ${escapeSQL(game.type)},
  ${escapeSQL(game.engagementCategory)},
  ${escapeSQL(game.launchUrl)},
  ${escapeSQL(game.placeId)},
  ${escapeSQL(game.accessCode)},
  ${escapeSQL(game.linkCode)},
  ${escapeSQL(game.description)},
  ${game.isActive ? 1 : 0},
  datetime('now'),
  datetime('now')
);`;
}

function generateClearSQL(): string {
  return 'DELETE FROM games;';
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const args = process.argv.slice(2);
  const isRemote = args.includes('--remote');
  const shouldClear = args.includes('--clear');

  const target = isRemote ? 'remote' : 'local';
  console.log(`\nSeeding games to ${target} D1...\n`);

  // Build SQL
  const statements: string[] = [];

  if (shouldClear) {
    console.log('Clearing existing games...');
    statements.push(generateClearSQL());
  }

  for (const game of GAMES) {
    statements.push(generateInsertSQL(game));
  }

  const sql = statements.join('\n\n');

  // Write to temp file (wrangler d1 execute reads from file)
  const tmpFile = '/tmp/seed-games.sql';
  await Bun.write(tmpFile, sql);

  // Execute via wrangler
  const wranglerArgs = isRemote ? '--remote' : '--local';

  try {
    const result =
      await $`bunx wrangler d1 execute alpha-community ${wranglerArgs} --file=${tmpFile}`.text();
    console.log(result);
  } catch (error) {
    console.error('Failed to execute SQL:', error);
    process.exit(1);
  }

  // Summary
  const activeGames = GAMES.filter((g) => g.isActive);
  const inactiveGames = GAMES.filter((g) => !g.isActive);

  console.log(`\nSeeded ${GAMES.length} games to ${target} D1:`);
  console.log(`  - ${activeGames.length} active (visible in arcade)`);
  console.log(`  - ${inactiveGames.length} inactive (hidden, awaiting private servers)`);

  if (inactiveGames.length > 0) {
    console.log('\nInactive games (set isActive: true when ready):');
    for (const game of inactiveGames) {
      console.log(`  - ${game.title}`);
    }
  }
}

main().catch(console.error);
