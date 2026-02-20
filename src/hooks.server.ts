/**
 * SvelteKit server hooks
 *
 * Routes Timeback auth requests through the SDK handler.
 * Populates event.locals.user from session cookie.
 * Provisions user in D1 on first authenticated request.
 */

import { building } from '$app/environment';
import { getTimeback } from '$lib/server/timeback';
import { getSessionFromCookie } from '$lib/server/session';
import { createDbClient } from '$lib/server/db/client';
import { svelteKitHandler } from '@timeback/sdk/svelte-kit';

import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  // Populate user from session cookie
  const user = await getSessionFromCookie(event.cookies);
  event.locals.user = user;

  // If user is authenticated and D1 is available, ensure they exist in database
  if (user && event.platform?.env?.DB) {
    try {
      const db = createDbClient(event.platform.env.DB);
      const dbUser = await db.users.upsert({
        timeback_id: user.id,
        email: user.email,
        display_name: user.displayName
      });
      await db.profiles.upsert(dbUser.id, {});
    } catch (error) {
      // Log but don't block the request if DB provisioning fails
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
