/**
 * Session management utilities
 *
 * Handles cookie-based session storage with HMAC signing for integrity.
 */

import { SESSION_SECRET } from '$env/static/private';
import type { Cookies } from '@sveltejs/kit';
import type { UserContext } from '$lib/types';

const COOKIE_NAME = 'alpha_session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/**
 * Sign data with HMAC-SHA256.
 */
async function sign(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

/**
 * Verify HMAC signature.
 */
async function verify(data: string, signature: string, secret: string): Promise<boolean> {
  const expectedSignature = await sign(data, secret);
  return signature === expectedSignature;
}

/**
 * Create a signed session cookie value.
 */
async function createSessionValue(user: UserContext): Promise<string> {
  const data = JSON.stringify(user);
  const signature = await sign(data, SESSION_SECRET);
  return `${btoa(data)}.${signature}`;
}

/**
 * Parse and verify a session cookie value.
 */
async function parseSessionValue(value: string): Promise<UserContext | null> {
  try {
    const [dataB64, signature] = value.split('.');
    if (!dataB64 || !signature) return null;

    const data = atob(dataB64);
    const isValid = await verify(data, signature, SESSION_SECRET);
    if (!isValid) return null;

    return JSON.parse(data) as UserContext;
  } catch {
    return null;
  }
}

/**
 * Set the session cookie.
 */
export async function setSessionCookie(cookies: Cookies, user: UserContext): Promise<void> {
  const value = await createSessionValue(user);
  cookies.set(COOKIE_NAME, value, {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE
  });
}

/**
 * Get the user from the session cookie.
 */
export async function getSessionFromCookie(cookies: Cookies): Promise<UserContext | null> {
  const value = cookies.get(COOKIE_NAME);
  if (!value) return null;
  return parseSessionValue(value);
}

/**
 * Clear the session cookie.
 */
export function clearSessionCookie(cookies: Cookies): void {
  cookies.delete(COOKIE_NAME, { path: '/' });
}

/**
 * Create session cookie header for use in redirect responses.
 * Used by the Timeback SDK callback which doesn't have access to SvelteKit cookies API.
 */
export async function createSessionCookieHeader(user: UserContext): Promise<string> {
  const value = await createSessionValue(user);
  const secure = import.meta.env.DEV ? '' : '; Secure';
  return `${COOKIE_NAME}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE}${secure}`;
}

/**
 * Parse session from a raw Cookie header string.
 * Used by the Timeback SDK getUser callback which only has access to Request.
 */
export async function getSessionFromRequest(request: Request): Promise<UserContext | null> {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';').map((c) => c.trim());
  const sessionCookie = cookies.find((c) => c.startsWith(`${COOKIE_NAME}=`));
  if (!sessionCookie) return null;

  const value = sessionCookie.substring(COOKIE_NAME.length + 1);
  return parseSessionValue(value);
}
