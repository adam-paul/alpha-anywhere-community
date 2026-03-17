#!/usr/bin/env bun
/**
 * Seed script for test users and friendships.
 *
 * Usage:
 *   bun run scripts/seed-users.ts              # Seed local D1
 *   bun run scripts/seed-users.ts --remote     # Seed remote D1
 *   bun run scripts/seed-users.ts --clear      # Clear test users first
 *
 * Creates test users with profiles so you can test the friend system
 * with a single SSO account. Your real SSO user can send/accept/decline
 * friend requests to these seeded users via the UI or API.
 *
 * Test users have timeback_id prefixed with "test-" so they're easy to identify.
 */

import { $ } from 'bun';

// =============================================================================
// TEST USERS
// =============================================================================

interface TestUser {
  id: string;
  timebackId: string;
  email: string;
  displayName: string;
  bio: string;
  location: string;
  interests: string[];
}

const TEST_USERS: TestUser[] = [
  {
    id: 'test-user-sophia',
    timebackId: 'test-tb-sophia',
    email: 'sophia@test.alpha.school',
    displayName: 'Sophia Chen',
    bio: 'Piano enthusiast and aspiring robotics engineer. I love building things!',
    location: 'Austin, TX',
    interests: ['piano', 'robotics', 'science', 'gaming']
  },
  {
    id: 'test-user-liam',
    timebackId: 'test-tb-liam',
    email: 'liam@test.alpha.school',
    displayName: 'Liam Martinez',
    bio: 'Basketball player who also loves to code. Currently learning Python.',
    location: 'Denver, CO',
    interests: ['basketball', 'gaming', 'science', 'movies']
  },
  {
    id: 'test-user-emma',
    timebackId: 'test-tb-emma',
    email: 'emma@test.alpha.school',
    displayName: 'Emma Wilson',
    bio: 'Artist and bookworm. Always drawing or reading fantasy novels.',
    location: 'Portland, OR',
    interests: ['drawing', 'art', 'books', 'painting']
  },
  {
    id: 'test-user-noah',
    timebackId: 'test-tb-noah',
    email: 'noah@test.alpha.school',
    displayName: 'Noah Thompson',
    bio: 'Space nerd who wants to work at NASA one day. Also plays guitar.',
    location: 'Houston, TX',
    interests: ['astronomy', 'guitar', 'science', 'hiking']
  },
  {
    id: 'test-user-olivia',
    timebackId: 'test-tb-olivia',
    email: 'olivia@test.alpha.school',
    displayName: 'Olivia Park',
    bio: 'Theatre kid and aspiring chef. I do improv and bake on weekends.',
    location: 'Chicago, IL',
    interests: ['theatre', 'drama', 'cooking', 'baking']
  },
  {
    id: 'test-user-james',
    timebackId: 'test-tb-james',
    email: 'james@test.alpha.school',
    displayName: 'James Rivera',
    bio: 'Competitive gamer and dinosaur enthusiast. Yes, both.',
    location: 'Miami, FL',
    interests: ['gaming', 'dinosaurs', 'movies', 'tennis']
  }
];

// Some pre-existing friendships between test users (for mutual friend testing)
const TEST_FRIENDSHIPS: Array<{
  requesterId: string;
  addresseeId: string;
  status: 'accepted' | 'pending';
}> = [
  { requesterId: 'test-user-sophia', addresseeId: 'test-user-liam', status: 'accepted' },
  { requesterId: 'test-user-sophia', addresseeId: 'test-user-emma', status: 'accepted' },
  { requesterId: 'test-user-liam', addresseeId: 'test-user-noah', status: 'accepted' },
  { requesterId: 'test-user-emma', addresseeId: 'test-user-olivia', status: 'accepted' },
  { requesterId: 'test-user-noah', addresseeId: 'test-user-james', status: 'accepted' },
  // One pending request for testing
  { requesterId: 'test-user-james', addresseeId: 'test-user-sophia', status: 'pending' }
];

// =============================================================================
// SQL
// =============================================================================

function escapeSQL(value: string | null): string {
  if (value === null) return 'NULL';
  return `'${value.replace(/'/g, "''")}'`;
}

function generateSQL(shouldClear: boolean): string {
  const statements: string[] = [];

  if (shouldClear) {
    statements.push('-- Clear test data');
    statements.push(
      "DELETE FROM friendships WHERE requester_id LIKE 'test-user-%' OR addressee_id LIKE 'test-user-%';"
    );
    statements.push("DELETE FROM profiles WHERE user_id LIKE 'test-user-%';");
    statements.push("DELETE FROM users WHERE id LIKE 'test-user-%';");
    statements.push('');
  }

  statements.push('-- Insert test users');
  for (const user of TEST_USERS) {
    statements.push(`INSERT OR REPLACE INTO users (id, timeback_id, email, display_name) VALUES (
  ${escapeSQL(user.id)},
  ${escapeSQL(user.timebackId)},
  ${escapeSQL(user.email)},
  ${escapeSQL(user.displayName)}
);`);
  }

  statements.push('');
  statements.push('-- Insert test profiles');
  for (const user of TEST_USERS) {
    statements.push(`INSERT OR REPLACE INTO profiles (user_id, bio, location, interests) VALUES (
  ${escapeSQL(user.id)},
  ${escapeSQL(user.bio)},
  ${escapeSQL(user.location)},
  ${escapeSQL(JSON.stringify(user.interests))}
);`);
  }

  statements.push('');
  statements.push('-- Insert test friendships');
  for (const f of TEST_FRIENDSHIPS) {
    statements.push(`INSERT OR IGNORE INTO friendships (requester_id, addressee_id, status) VALUES (
  ${escapeSQL(f.requesterId)},
  ${escapeSQL(f.addresseeId)},
  ${escapeSQL(f.status)}
);`);
  }

  return statements.join('\n');
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const args = process.argv.slice(2);
  const isRemote = args.includes('--remote');
  const shouldClear = args.includes('--clear');

  const target = isRemote ? 'remote' : 'local';
  console.log(`\nSeeding test users to ${target} D1...\n`);

  const sql = generateSQL(shouldClear);
  const tmpFile = '/tmp/seed-users.sql';
  await Bun.write(tmpFile, sql);

  const wranglerArgs = isRemote ? '--remote' : '--local';

  try {
    const result =
      await $`bunx wrangler d1 execute alpha-community ${wranglerArgs} --file=${tmpFile}`.text();
    console.log(result);
  } catch (error) {
    console.error('Failed to execute SQL:', error);
    process.exit(1);
  }

  console.log(`\nSeeded ${TEST_USERS.length} test users to ${target} D1.`);
  console.log(`Seeded ${TEST_FRIENDSHIPS.length} friendships between test users.`);
  if (shouldClear) {
    console.log('(Previous test data was cleared first.)');
  }
  console.log('\nTest users:');
  for (const user of TEST_USERS) {
    console.log(`  - ${user.displayName} (${user.id})`);
  }
  console.log('\nYou can now:');
  console.log('  1. Browse /explore to see test users');
  console.log('  2. Visit /profile/test-user-sophia to see a test profile');
  console.log('  3. Click "Add Friend" to send a friend request');
  console.log("  4. Use curl to accept/decline from the test user's perspective");
}

main().catch(console.error);
