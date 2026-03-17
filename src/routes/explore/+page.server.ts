/**
 * Explore page server load
 *
 * Fetches all users with profiles from D1 for the student grid.
 * If authenticated, computes mutual friends per student.
 */

import { error } from '@sveltejs/kit';
import { createDbClient } from '$lib/server/db/client';
import type { PageServerLoad } from './$types';
import type { Interest } from '$lib/types';

export const load: PageServerLoad = async ({ platform, locals }) => {
  if (!platform?.env?.DB) {
    error(503, 'Database not available');
  }

  const db = createDbClient(platform.env.DB);
  const usersWithProfiles = await db.users.findAllWithProfiles();

  // Load viewer's friend IDs once for mutual friend computation
  let viewerFriendIds: Set<string> | null = null;
  if (locals.user) {
    const friends = await db.friendships.getFriends(locals.user.id);
    viewerFriendIds = new Set(friends.map((f) => f.id));
  }

  // Transform DB data to Student-like shape for the UI
  const students = usersWithProfiles.map((u) => {
    const interests: Interest[] = u.profile?.interests ? JSON.parse(u.profile.interests) : [];

    const joinedDate = new Date(u.created_at).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric'
    });

    // Compute mutual friends: intersection of viewer's friends with this student's ID
    // (A mutual friend is someone who is friends with both the viewer and this student)
    // For now, we just check if this student is a friend — full mutual computation
    // would require loading each student's friend list. We pass the viewer's friend IDs
    // so the UI can at least show "Friend" badges.
    const mutualFriendIds: string[] = [];
    // TODO: Full mutual friend computation requires per-student friend lists.
    // For now, this remains empty. The profile page computes it accurately.

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
      mutualFriendIds,
      isFriend: viewerFriendIds?.has(u.id) ?? false
    };
  });

  return { students };
};
