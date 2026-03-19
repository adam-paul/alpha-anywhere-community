/**
 * Roblox user lookup — resolve username to user identity for account linking.
 *
 * POST - Look up a Roblox user by username, return avatar + display name for confirmation.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { RobloxUserLookupResult } from '$lib/types';

interface RobloxUserResponse {
  data: Array<{
    id: number;
    name: string;
    displayName: string;
    hasVerifiedBadge: boolean;
  }>;
}

interface RobloxThumbnailResponse {
  data: Array<{
    targetId: number;
    state: string;
    imageUrl: string;
  }>;
}

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) error(401, 'Not authenticated');

  const body = await request.json();
  const username = body.username?.trim();
  if (!username) error(400, 'Username is required');

  // Resolve username → Roblox user ID
  const userRes = await fetch('https://users.roblox.com/v1/usernames/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usernames: [username], excludeBannedUsers: true })
  });

  if (!userRes.ok) error(502, 'Failed to reach Roblox API');

  const userData: RobloxUserResponse = await userRes.json();
  if (!userData.data || userData.data.length === 0) {
    error(404, 'Roblox user not found');
  }

  const robloxUser = userData.data[0];

  // Fetch avatar headshot
  const thumbRes = await fetch(
    `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${robloxUser.id}&size=150x150&format=Png&isCircular=false`
  );

  let avatarUrl = '';
  if (thumbRes.ok) {
    const thumbData: RobloxThumbnailResponse = await thumbRes.json();
    avatarUrl = thumbData.data?.[0]?.imageUrl ?? '';
  }

  const result: RobloxUserLookupResult = {
    robloxUserId: String(robloxUser.id),
    robloxUsername: robloxUser.name,
    robloxDisplayName: robloxUser.displayName,
    robloxAvatarUrl: avatarUrl
  };

  return json({ success: true, result });
};
