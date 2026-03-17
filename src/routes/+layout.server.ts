/**
 * Root layout server load
 *
 * Passes session and app-wide counts to all pages via event.locals (populated in hooks.server.ts).
 */

import { createDbClient } from '$lib/server/db/client';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, platform }) => {
  let pendingFriendRequestCount = 0;

  if (locals.user && platform?.env?.DB) {
    const db = createDbClient(platform.env.DB);
    pendingFriendRequestCount = await db.friendships.getPendingRequestCount(locals.user.id);
  }

  return {
    user: locals.user,
    pendingFriendRequestCount
  };
};
