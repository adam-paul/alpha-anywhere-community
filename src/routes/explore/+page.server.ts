/**
 * Explore page server load
 *
 * Fetches all users with profiles from D1 for the student grid.
 */

import { error } from '@sveltejs/kit';
import { createDbClient } from '$lib/server/db/client';
import type { PageServerLoad } from './$types';
import type { Interest } from '$lib/types';

export const load: PageServerLoad = async ({ platform }) => {
  if (!platform?.env?.DB) {
    error(503, 'Database not available');
  }

  const db = createDbClient(platform.env.DB);
  const usersWithProfiles = await db.users.findAllWithProfiles();

  // Transform DB data to Student-like shape for the UI
  const students = usersWithProfiles.map((u) => {
    const interests: Interest[] = u.profile?.interests ? JSON.parse(u.profile.interests) : [];

    const joinedDate = new Date(u.created_at).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric'
    });

    return {
      id: u.id,
      displayName: u.display_name,
      handle: u.display_name.toLowerCase().replace(/\s+/g, '_'),
      avatarUrl: u.profile?.avatar_url ?? undefined,
      coverUrl: u.profile?.cover_url ?? undefined,
      location: u.profile?.location ?? 'Location not set',
      bio: u.profile?.bio ?? '',
      interests,
      joinedDate,
      // Stats come from LWAI (not implemented yet)
      stats: {
        xpEarned: 0,
        timebackHours: 0,
        dailyXpCurrent: 0,
        dailyXpGoal: 120
      },
      // Mutual friends come from friendships table (not implemented yet)
      mutualFriendIds: []
    };
  });

  return { students };
};
