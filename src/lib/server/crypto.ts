/**
 * AES-256-GCM encryption for sensitive credentials.
 * Uses Web Crypto API (available in Cloudflare Workers and Bun).
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const NONCE_LENGTH = 12; // 96 bits, recommended for GCM

/**
 * Import a base64-encoded key for use with Web Crypto.
 */
async function importKey(base64Key: string): Promise<CryptoKey> {
  const keyData = Uint8Array.from(atob(base64Key), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey('raw', keyData, { name: ALGORITHM, length: KEY_LENGTH }, false, [
    'encrypt',
    'decrypt'
  ]);
}

/**
 * Encrypt plaintext string.
 * Returns base64(nonce || ciphertext || authTag).
 */
export async function encrypt(plaintext: string, base64Key: string): Promise<string> {
  const key = await importKey(base64Key);
  const nonce = crypto.getRandomValues(new Uint8Array(NONCE_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt({ name: ALGORITHM, iv: nonce }, key, encoded);

  // Combine nonce + ciphertext into single buffer
  const combined = new Uint8Array(nonce.length + ciphertext.byteLength);
  combined.set(nonce, 0);
  combined.set(new Uint8Array(ciphertext), nonce.length);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt ciphertext string.
 * Expects base64(nonce || ciphertext || authTag).
 */
export async function decrypt(ciphertext: string, base64Key: string): Promise<string> {
  const key = await importKey(base64Key);
  const combined = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));

  const nonce = combined.slice(0, NONCE_LENGTH);
  const data = combined.slice(NONCE_LENGTH);

  const decrypted = await crypto.subtle.decrypt({ name: ALGORITHM, iv: nonce }, key, data);

  return new TextDecoder().decode(decrypted);
}
