#!/usr/bin/env bun
/**
 * CLI tool to encrypt a credential for the seed script.
 *
 * Usage:
 *   GAME_CREDENTIALS_KEY=<key> bun run scripts/encrypt-credential.ts <plaintext>
 *
 * Example:
 *   GAME_CREDENTIALS_KEY=abc123... bun run scripts/encrypt-credential.ts "365ac2f6-cde8-41b1-82ff-93dafd34258a"
 *
 * Output: encrypted string to paste into seed-games.ts
 */

import { encrypt } from '../src/lib/server/crypto';

async function main() {
  const plaintext = process.argv[2];
  const key = process.env.GAME_CREDENTIALS_KEY;

  if (!plaintext) {
    console.error(
      'Usage: GAME_CREDENTIALS_KEY=<key> bun run scripts/encrypt-credential.ts <plaintext>'
    );
    process.exit(1);
  }

  if (!key) {
    console.error('Error: GAME_CREDENTIALS_KEY environment variable not set');
    console.error('Generate a key with: bun run scripts/generate-key.ts');
    process.exit(1);
  }

  const encrypted = await encrypt(plaintext, key);
  console.log(encrypted);
}

main().catch(console.error);
