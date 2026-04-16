/**
 * Session management utilities
 *
 * Handles cookie-based session storage with HMAC signing for integrity.
 * Format + signing primitives live in `@alpha/shared/session` so the
 * Realtime Worker can verify the same cookie.
 */

import { env } from '$env/dynamic/private';
import type { Cookies } from '@sveltejs/kit';
import {
  COOKIE_NAME,
  createSignedCookieValue,
  extractCookieFromHeader,
  parseSignedCookieValue
} from '@alpha/shared/session';
import type { UserContext } from '$lib/types';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/** Cookie domain — shared across subdomains in production, omitted for localhost. */
function getCookieDomain(url?: string): string | undefined {
  if (url) {
    try {
      const hostname = new URL(url).hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') return undefined;
    } catch {
      // Fall through to production default
    }
  }
  return '.alpha-community.school';
}

/**
 * Set the session cookie.
 */
export async function setSessionCookie(
  cookies: Cookies,
  user: UserContext,
  requestUrl?: string
): Promise<void> {
  const value = await createSignedCookieValue(user, env.SESSION_SECRET);
  const domain = getCookieDomain(requestUrl);
  const isLocalhost = requestUrl ? new URL(requestUrl).hostname === 'localhost' : false;
  cookies.set(COOKIE_NAME, value, {
    path: '/',
    ...(domain && { domain }),
    httpOnly: true,
    secure: !isLocalhost,
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    encode: (v) => v
  });
}

/**
 * Get the user from the session cookie.
 */
export async function getSessionFromCookie(cookies: Cookies): Promise<UserContext | null> {
  const value = cookies.get(COOKIE_NAME);
  if (!value) return null;
  return parseSignedCookieValue<UserContext>(value, env.SESSION_SECRET);
}

/**
 * Clear the session cookie.
 */
export function clearSessionCookie(cookies: Cookies, requestUrl?: string): void {
  const domain = getCookieDomain(requestUrl);
  // Delete both with and without domain to clear cookies from before the domain change
  cookies.delete(COOKIE_NAME, { path: '/' });
  if (domain) {
    cookies.delete(COOKIE_NAME, { path: '/', domain });
  }
}

/**
 * Create session cookie header for use in redirect responses.
 * Used by the Timeback SDK callback which doesn't have access to SvelteKit cookies API.
 */
export async function createSessionCookieHeader(
  user: UserContext,
  requestUrl?: string
): Promise<string> {
  const value = await createSignedCookieValue(user, env.SESSION_SECRET);
  const isLocalhost = requestUrl ? new URL(requestUrl).hostname === 'localhost' : false;
  const secure = isLocalhost ? '' : '; Secure';
  const domain = getCookieDomain(requestUrl);
  const domainStr = domain ? `; Domain=${domain}` : '';
  return `${COOKIE_NAME}=${value}; Path=/${domainStr}; HttpOnly; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE}${secure}`;
}

/**
 * Parse session from a raw Cookie header string.
 * Used by the Timeback SDK getUser callback which only has access to Request.
 */
export async function getSessionFromRequest(request: Request): Promise<UserContext | null> {
  const value = extractCookieFromHeader(request.headers.get('cookie'), COOKIE_NAME);
  if (!value) return null;
  return parseSignedCookieValue<UserContext>(value, env.SESSION_SECRET);
}
