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
 * ## Credential Encryption
 *
 * The accessCode and linkCode values below are AES-256-GCM encrypted.
 * They are decrypted at runtime using the GAME_CREDENTIALS_KEY secret.
 *
 * To add new credentials:
 *   1. Get the plaintext accessCode and linkCode (see below)
 *   2. Encrypt each value:
 *      GAME_CREDENTIALS_KEY=<key> bun run scripts/encrypt-credential.ts "<plaintext>"
 *   3. Paste the encrypted output into this file
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
    // Encrypted with GAME_CREDENTIALS_KEY
    accessCode:
      'k+Tqn7w7zvrlqLxoF/D07Se7w6YJOGAjpoLOZLqzC8UE/7Vqujb5i8CQK0CwGbdoa6OYf3/JlANOMLg/4sXoWA==',
    linkCode: 'L8SCAkCVBE1jjTCr8xrABrVEIDsxstioiPVHzmwCckPJmW4PherdJXnUep5l/E6k5wSjgFHuG28t02q4',
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
    accessCode:
      'ltNFl9wBRQNCxN2RCF5XOqBK1X9AEmPshbMNW2/kCuh2Is4oZ1NQDhcpH+cyzKOSdSHkHXHdqacpP19tSY1qEw==',
    linkCode: 'gllPcwqvQBn1a0E/nj4e7H1cbMWx7KhigOxOZfx6/Icpt16h5Pa0Iw6PTY3XJohb37uXJgi9QHsxt3tP',
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
    accessCode:
      'gvZrjbfpfCwbh91seg17zELDje4X2yQURYxdcZ7sx1xsSFtRRuSwJftV0UddhaNLdN1lC74fUfK7pBlS0aGWUQ==',
    linkCode: 'u3EJACCC7UgMoViVuaS/SAJliZkoOSRJKgz9FKwObqoLnwR3ZtbbRduF35Q68bS9teX86f+8ymqAq6Be',
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
    accessCode:
      '5I/7IWslCqZeU7oK5bwwev6DYlHCdjSehsIOGGtEEFlRCitUqfr44eTa/HMxBGMBJv/ONSR2Oj14bkY3dkwXDA==',
    linkCode: '4pufJz3csj33mrC3rR6Vj7eWBDehBnec2JPugmsu1CLru7dKOBAk4lMLzT5goTVPv1nUAQTjkhGQUIBN',
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
    accessCode:
      'EeNwRMQtVgGREbOy6dQL+z+Pi21/bd8m3O6BLb8W3jVbMc+DDku6salZqZzQlPKUoT+l/uklGH+VPCI39tt/PQ==',
    linkCode: 'qN9IEMBd50ROO1xZHWQAS8XpIgOZFfBOrGpc7QJiVHUvS5/ba/Wdd4GQb9hWbS5JE9/+jXUoTGRdcBqh',
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
    accessCode:
      'IBTnZ1GpjAoxYdG8LXUPNq5+AFbKxQUGFjt4tBcrLixkpp2vEXTUAVymPpUrGrPtjpNsDkuY0yzOh8IF4nKutw==',
    linkCode: 'QPeODXeaE8nQjdiR8N2SAnpY5YzEOPhwkCWQt3wtjaYuVeuWfHsdD0OVk+l5fz1MWvij/y7dWFzPt89D',
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
    accessCode:
      '9cSLYyLgMhrlnKhXZFCexchyLQUPidOGxtickA8RZ4paY2bjGl0i6oeeVz8M6+vYYDYOk8QQeV3KgQUUJeKrXA==',
    linkCode: 'o4l3kBXTuXSOGUT9ksJ+Ybre92/BSXW55Ou5IX6DSR32Iy4WBDcB9lyHNhWAxcxvfwiy0RPlkynMDAY+',
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
    accessCode:
      '61OzkYNPQD+Gbm47249c1lR7XBcx2ejmjhoWXPhZzA0gNI9pFoJk2uR0Ld5PwgXVOSa/CsWW5ESZ0Cqp1Hi1YQ==',
    linkCode: 'lOgFQBtYwB/L++w/0TGsuBE/EejlCupfXMW/mQGSfNVX9YkgCSbMtqSPDQVZlZxPgZ0f3wXlYL7PMphJ',
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
    accessCode:
      'kk+fv/yN2XoBq3ZDw93EIoxBguy6tbz4oebmTrdaVrYVE9uMIJ+sUIzOaRJ/zdj7Y0LTitTzGaW6fpYby0p49g==',
    linkCode: 'z+XniedkfGK0e/WQgkFj6v2UqyFBMNNQOGkU4vMme9UknAqtGI5AV89vYZ/QBcQ+LAI5v1cdxBXnJWGt',
    isActive: true
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
