#!/usr/bin/env bun
/**
 * Seed script for the games catalog.
 *
 * Usage:
 *   bun run db:seed                # Seed local D1
 *   bun run db:seed:remote         # Seed remote D1
 *   bun run scripts/seed-games.ts --clear          # Clear existing games first
 *
 * Games are upserted by ID using INSERT OR REPLACE.
 *
 * ## Credentials
 *
 * Private server credentials live in scripts/game-credentials.json (gitignored).
 * This script encrypts them at insert time using GAME_CREDENTIALS_KEY.
 *
 * To add a new game with private server credentials:
 *   1. Add the game metadata to the GAMES array below
 *   2. Add credentials to scripts/game-credentials.json:
 *      { "my-game-id": { "accessCode": "...", "linkCode": "..." } }
 *   3. Run: bun run db:seed
 *
 * If GAME_CREDENTIALS_KEY is not set, credentials are stored as plaintext
 * (fine for local dev).
 *
 * ## How to Get Private Server Credentials
 *
 * 1. Go to the game on Roblox.com
 * 2. Click the "..." menu → "Create Private Server" (may require Robux)
 * 3. Copy the share link: https://www.roblox.com/share?code=XXXXXXXX&type=Server
 * 4. Open the share link in a browser with DevTools open (Console tab)
 * 5. Look for both values in the console logs:
 *    - accessCode: UUID like 365ac2f6-cde8-41b1-82ff-93dafd34258a
 *    - linkCode: Numeric string like 32872177519509092753493698228788
 * 6. The placeId is the game's numeric ID (visible in the game URL)
 *
 * Both accessCode AND linkCode are required — the deep link won't work with just one.
 */

import { $ } from 'bun';
import { encrypt } from '../src/lib/server/crypto';
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
  isActive: boolean; // false = exists in DB but hidden from arcade
}

interface GameCredentials {
  accessCode: string;
  linkCode: string;
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
    isActive: true
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
    isActive: true
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
    isActive: true
  },
  {
    id: 'regretevator',
    title: 'Regretevator',
    description: 'A quirky elevator game with unexpected twists.',
    thumbnailUrl:
      'https://tr.rbxcdn.com/180DAY-5a37ffd91acbb6abbe3ce78bef9c9321/512/512/Image/Png/noFilter',
    type: 'roblox',
    engagementCategory: 'ice-breaker',
    placeId: '4972273297',
    launchUrl: 'https://www.roblox.com/games/4972273297/Regretevator',
    isActive: true
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
    isActive: true
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
    isActive: true
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
    isActive: true
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
    isActive: true
  }
];

// =============================================================================
// CREDENTIALS
// =============================================================================

async function loadCredentials(): Promise<Record<string, GameCredentials>> {
  const credentialsPath = new URL('./game-credentials.json', import.meta.url).pathname;
  const file = Bun.file(credentialsPath);

  if (!(await file.exists())) {
    console.log('No game-credentials.json found — seeding without private server credentials.');
    return {};
  }

  return file.json();
}

async function encryptCredential(plaintext: string, key: string | undefined): Promise<string> {
  if (!key) return plaintext;
  return encrypt(plaintext, key);
}

// =============================================================================
// SQL GENERATION
// =============================================================================

function escapeSQL(value: string | undefined | null): string {
  if (value === undefined || value === null) return 'NULL';
  return `'${value.replace(/'/g, "''")}'`;
}

interface InsertValues {
  game: GameSeed;
  accessCode?: string;
  linkCode?: string;
}

function generateInsertSQL({ game, accessCode, linkCode }: InsertValues): string {
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
  ${escapeSQL(accessCode)},
  ${escapeSQL(linkCode)},
  ${escapeSQL(game.description)},
  ${game.isActive ? 1 : 0},
  datetime('now'),
  datetime('now')
);`;
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

  const credentials = await loadCredentials();
  const key = process.env.GAME_CREDENTIALS_KEY;

  if (Object.keys(credentials).length > 0 && !key) {
    console.log('GAME_CREDENTIALS_KEY not set — credentials will be stored as plaintext.\n');
  }

  // Build SQL (encrypt credentials at insert time)
  const statements: string[] = [];

  if (shouldClear) {
    console.log('Clearing existing games...');
    statements.push('DELETE FROM games;');
  }

  let withCreds = 0;
  let withoutCreds = 0;

  for (const game of GAMES) {
    const creds = credentials[game.id];
    let accessCode: string | undefined;
    let linkCode: string | undefined;

    if (creds) {
      accessCode = await encryptCredential(creds.accessCode, key);
      linkCode = await encryptCredential(creds.linkCode, key);
      withCreds++;
    } else {
      withoutCreds++;
    }

    statements.push(generateInsertSQL({ game, accessCode, linkCode }));
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
  console.log(`  - ${inactiveGames.length} inactive (hidden)`);
  console.log(`  - ${withCreds} with encrypted credentials`);
  console.log(`  - ${withoutCreds} without credentials`);

  if (inactiveGames.length > 0) {
    console.log('\nInactive games (set isActive: true when ready):');
    for (const game of inactiveGames) {
      console.log(`  - ${game.title}`);
    }
  }
}

main().catch(console.error);
