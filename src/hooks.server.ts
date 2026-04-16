/**
 * SvelteKit server hooks
 *
 * Routes Timeback auth requests through the SDK handler.
 * Populates event.locals.user from session cookie.
 * Provisions user in D1 on first authenticated request.
 */

import { building } from '$app/environment';
import { getTimeback } from '$lib/server/timeback';
import { getSessionFromCookie, setSessionCookie } from '$lib/server/session';
import { createDbClient } from '$lib/server/db/client';
import { svelteKitHandler } from '@timeback/sdk/svelte-kit';

import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  // Populate user from session cookie (enriched from D1 below)
  const cookieUser = await getSessionFromCookie(event.cookies);
  event.locals.user = cookieUser;

  // If user is authenticated and D1 is available, ensure they exist in database
  if (cookieUser && event.platform?.env?.DB) {
    try {
      const db = createDbClient(event.platform.env.DB);
      const dbUser = await db.users.upsert({
        timeback_id: cookieUser.timebackId,
        email: cookieUser.email,
        display_name: cookieUser.displayName
      });
      const dbProfile = await db.profiles.upsert(dbUser.id, {});
      const enrichedUser = {
        id: dbUser.id,
        timebackId: dbUser.timeback_id,
        email: dbUser.email,
        displayName: dbUser.display_name,
        role: dbUser.role,
        avatarUrl: dbProfile.avatar_url ?? undefined
      };
      event.locals.user = enrichedUser;

      // Re-set cookie if the ID was stale (e.g., SSO callback sets timebackId
      // as a temporary ID before D1 provisioning)
      if (cookieUser.id !== dbUser.id) {
        await setSessionCookie(event.cookies, enrichedUser, event.url.origin);
      }
    } catch (error) {
      console.error('Failed to provision user in D1:', error);
    }
  }

  // Let Timeback handle auth routes
  return svelteKitHandler({
    timeback: getTimeback(),
    event,
    resolve,
    building,
    callbackPath: '/auth/callback'
  });
};
