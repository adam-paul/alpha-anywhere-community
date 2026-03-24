/**
 * Root layout server load
 *
 * Passes session, friend list, and app-wide counts to all pages via event.locals (populated in hooks.server.ts).
 */

import { createDbClient } from '$lib/server/db/client';
import type { FriendSummary } from '$lib/types';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, platform }) => {
  let pendingFriendRequestCount = 0;
  let friends: FriendSummary[] = [];

  if (locals.user && platform?.env?.DB) {
    const db = createDbClient(platform.env.DB);
    const [count, friendUsers] = await Promise.all([
      db.friendships.getPendingRequestCount(locals.user.id),
      db.friendships.getFriends(locals.user.id)
    ]);
    pendingFriendRequestCount = count;

    const friendProfiles = await Promise.all(
      friendUsers.map((u) => db.profiles.findByUserId(u.id))
    );
    friends = friendUsers.map((u, i) => ({
      id: u.id,
      displayName: u.display_name,
      avatarUrl: friendProfiles[i]?.avatar_url ?? null
    }));
  }

  return {
    user: locals.user,
    pendingFriendRequestCount,
    friends
  };
};
