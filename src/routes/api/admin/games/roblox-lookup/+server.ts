/**
 * Roblox game metadata lookup
 *
 * POST - Accepts a Roblox game URL, returns title, description, thumbnail, placeId, launchUrl
 */

import { json, error } from '@sveltejs/kit';
import { assertAdmin } from '$lib/server/admin';
import type { RequestHandler } from './$types';

const ROBLOX_URL_PATTERN = /roblox\.com\/games\/(\d+)/i;

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) error(401, 'Not authenticated');
  assertAdmin(locals.user);

  const { url: robloxUrl } = await request.json();
  if (!robloxUrl || typeof robloxUrl !== 'string') {
    error(400, 'url is required');
  }

  const match = robloxUrl.match(ROBLOX_URL_PATTERN);
  if (!match) {
    error(400, 'Invalid Roblox URL. Expected: https://www.roblox.com/games/12345/...');
  }
  const placeId = match[1];

  // Step 1: place → universe
  const universeRes = await fetch(
    `https://apis.roblox.com/universes/v1/places/${placeId}/universe`
  );
  if (!universeRes.ok) error(502, 'Failed to look up Roblox universe');
  const { universeId } = (await universeRes.json()) as { universeId: number };

  // Step 2: universe → metadata
  const metaRes = await fetch(`https://games.roblox.com/v1/games?universeIds=${universeId}`);
  if (!metaRes.ok) error(502, 'Failed to fetch Roblox game metadata');
  const metaData = (await metaRes.json()) as {
    data: Array<{ name: string; description: string }>;
  };
  const gameMeta = metaData.data[0];
  if (!gameMeta) error(502, 'No game data returned from Roblox');

  // Step 3: universe → thumbnail
  let thumbnailUrl = '';
  const thumbRes = await fetch(
    `https://thumbnails.roblox.com/v1/games/icons?universeIds=${universeId}&size=512x512&format=Png&isCircular=false`
  );
  if (thumbRes.ok) {
    const thumbData = (await thumbRes.json()) as { data: Array<{ imageUrl: string }> };
    thumbnailUrl = thumbData.data[0]?.imageUrl ?? '';
  }

  return json({
    success: true,
    result: {
      title: gameMeta.name,
      description: gameMeta.description,
      thumbnailUrl,
      placeId,
      launchUrl: `https://www.roblox.com/games/${placeId}`
    }
  });
};
