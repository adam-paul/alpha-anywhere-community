#!/usr/bin/env bun
/**
 * Generate a new AES-256 encryption key.
 *
 * Usage:
 *   bun run scripts/generate-key.ts
 *
 * Output: base64-encoded 256-bit key
 *
 * Store this securely and set as GAME_CREDENTIALS_KEY in:
 * - .env (local development)
 * - Cloudflare secrets (production)
 */

const key = crypto.getRandomValues(new Uint8Array(32));
const base64 = btoa(String.fromCharCode(...key));
console.log(base64);
