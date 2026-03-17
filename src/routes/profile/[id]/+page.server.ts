/**
 * Profile page server load
 *
 * Fetches user, profile, and friendship data from D1.
 * Handles 'me' as a special ID that resolves to the current user.
 */

import { error, redirect } from '@sveltejs/kit';
import { createDbClient } from '$lib/server/db/client';
import type { FriendshipStatus } from '$lib/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, platform }) => {
  const { id } = params;

  // Handle 'me' → redirect to actual user ID (or show error if not logged in)
  if (id === 'me') {
    if (!locals.user) {
      redirect(302, '/');
    }
    redirect(302, `/profile/${locals.user.id}`);
  }

  // Fetch user by D1 internal ID
  if (!platform?.env?.DB) {
    error(503, 'Database not available');
  }

  const db = createDbClient(platform.env.DB);
  const dbUser = await db.users.findById(id);

  if (!dbUser) {
    error(404, 'User not found');
  }

  const dbProfile = await db.profiles.findByUserId(dbUser.id);

  // Check if this is the current user's own profile
  const isOwnProfile = locals.user?.id === dbUser.id;
  const viewerId = locals.user?.id;

  // Load friendship data
  let friendshipStatus: FriendshipStatus = isOwnProfile ? { kind: 'self' } : { kind: 'none' };
  let friends: Array<{ id: string; displayName: string; avatarUrl: string | null }> = [];
  let mutualFriends: Array<{ id: string; displayName: string; avatarUrl: string | null }> = [];

  if (isOwnProfile) {
    // Own profile: load full friends list
    const friendDbUsers = await db.friendships.getFriends(dbUser.id);
    const friendProfiles = await Promise.all(
      friendDbUsers.map((u) => db.profiles.findByUserId(u.id))
    );
    friends = friendDbUsers.map((u, i) => ({
      id: u.id,
      displayName: u.display_name,
      avatarUrl: friendProfiles[i]?.avatar_url ?? null
    }));
  } else if (viewerId) {
    // Other profile: load friendship status and mutual friends
    const row = await db.friendships.getStatus(viewerId, dbUser.id);
    if (row) {
      if (row.status === 'accepted') {
        friendshipStatus = { kind: 'friends', friendshipId: row.id };
      } else if (row.status === 'pending') {
        friendshipStatus =
          row.requester_id === viewerId
            ? { kind: 'pending-sent', friendshipId: row.id }
            : { kind: 'pending-received', friendshipId: row.id };
      }
    }

    const mutualDbUsers = await db.friendships.getMutualFriends(viewerId, dbUser.id);
    const mutualProfiles = await Promise.all(
      mutualDbUsers.map((u) => db.profiles.findByUserId(u.id))
    );
    mutualFriends = mutualDbUsers.map((u, i) => ({
      id: u.id,
      displayName: u.display_name,
      avatarUrl: mutualProfiles[i]?.avatar_url ?? null
    }));
  }

  return {
    user: {
      id: dbUser.id,
      displayName: dbUser.display_name,
      email: dbUser.email,
      createdAt: dbUser.created_at
    },
    profile: dbProfile
      ? {
          bio: dbProfile.bio,
          location: dbProfile.location,
          avatarUrl: dbProfile.avatar_url,
          coverUrl: dbProfile.cover_url,
          interests: dbProfile.interests ? JSON.parse(dbProfile.interests) : []
        }
      : {
          bio: null,
          location: null,
          avatarUrl: null,
          coverUrl: null,
          interests: []
        },
    isOwnProfile,
    friendshipStatus,
    friends,
    mutualFriends
  };
};
