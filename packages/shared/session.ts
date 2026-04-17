/**
 * Session cookie primitives — shared between the SvelteKit app and the
 * Realtime Worker.
 *
 * The session cookie format is `<base64(JSON)>.<HMAC-SHA256 base64>`. The
 * JSON payload is readable (not encrypted); the HMAC proves it wasn't
 * tampered with. Both sides of the app must agree on the format and the
 * signing algorithm, so those primitives live here.
 */

const encoder = new TextEncoder();

/** Name of the session cookie on `.alpha-community.school`. */
export const COOKIE_NAME = 'alpha_session';

/**
 * Compute HMAC-SHA256 of `data` with `secret` and return the raw signature
 * bytes. Internal primitive shared by every keyed-hash caller — base64 for
 * cookie signing (`sign`), hex for DB identifiers (`signHex`).
 */
async function hmacSha256(data: string, secret: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return new Uint8Array(signature);
}

/** Sign `data` with HMAC-SHA256 and return the signature as base64. */
export async function sign(data: string, secret: string): Promise<string> {
  const bytes = await hmacSha256(data, secret);
  return btoa(String.fromCharCode(...bytes));
}

/**
 * Sign `data` with HMAC-SHA256 and return the signature as lowercase hex.
 *
 * Value-stability note: changing the algorithm or the secret makes every
 * previously-computed hash uncorrelatable. Callers that persist these in the
 * DB (e.g. `generation_events.user_id_hash`) rely on the output staying
 * stable across deploys.
 */
export async function signHex(data: string, secret: string): Promise<string> {
  const bytes = await hmacSha256(data, secret);
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Verify a base64 HMAC-SHA256 signature against `data`. */
export async function verify(data: string, signature: string, secret: string): Promise<boolean> {
  const expected = await sign(data, secret);
  return signature === expected;
}

/** Build `<base64(JSON(payload))>.<signature>` for use as a cookie value. */
export async function createSignedCookieValue<T>(payload: T, secret: string): Promise<string> {
  const data = JSON.stringify(payload);
  const signature = await sign(data, secret);
  return `${btoa(data)}.${signature}`;
}

/**
 * Parse a signed cookie value. Returns the payload on success, `null` on
 * any failure (malformed, bad signature, invalid JSON).
 */
export async function parseSignedCookieValue<T>(value: string, secret: string): Promise<T | null> {
  try {
    const [dataB64, signature] = value.split('.');
    if (!dataB64 || !signature) return null;

    const data = atob(dataB64);
    const isValid = await verify(data, signature, secret);
    if (!isValid) return null;

    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

/**
 * Extract a cookie value by name from a raw `Cookie:` header. Used when
 * the SvelteKit `cookies` API isn't available (Worker requests, Timeback
 * SDK callbacks that only hand over a raw `Request`).
 */
export function extractCookieFromHeader(header: string | null, name: string): string | null {
  if (!header) return null;
  const parts = header.split(';').map((c) => c.trim());
  const match = parts.find((c) => c.startsWith(`${name}=`));
  if (!match) return null;
  return match.substring(name.length + 1);
}
