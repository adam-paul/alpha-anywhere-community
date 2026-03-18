/**
 * Admin game management — create
 *
 * POST - Create a new game (encrypts credentials if key is set)
 */

import { json, error } from '@sveltejs/kit';
import { createDbClient } from '$lib/server/db/client';
import { assertAdmin } from '$lib/server/admin';
import { encrypt } from '$lib/server/crypto';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals, platform }) => {
  if (!locals.user) error(401, 'Not authenticated');
  assertAdmin(locals.user);
  if (!platform?.env?.DB) error(503, 'Database not available');

  const body = await request.json();

  const { title, slug, type, engagementCategory, launchUrl } = body;
  if (!title || !slug || !type || !engagementCategory || !launchUrl) {
    error(400, 'Missing required fields: title, slug, type, engagementCategory, launchUrl');
  }

  const id = slug;

  // Encrypt credentials if provided
  const key = env.GAME_CREDENTIALS_KEY;
  let accessCode: string | null = null;
  let linkCode: string | null = null;
  if (body.accessCode) {
    accessCode = key ? await encrypt(body.accessCode, key) : body.accessCode;
  }
  if (body.linkCode) {
    linkCode = key ? await encrypt(body.linkCode, key) : body.linkCode;
  }

  const db = createDbClient(platform.env.DB);

  try {
    const game = await db.games.create({
      id,
      title,
      type,
      engagement_category: engagementCategory,
      launch_url: launchUrl,
      thumbnail_url: body.thumbnailUrl || null,
      place_id: body.placeId || null,
      private_server_access_code: accessCode,
      link_code: linkCode,
      description: body.description || null,
      is_active: body.isActive !== false ? 1 : 0
    });

    return json({ success: true, game });
  } catch (err) {
    if (err instanceof Error && err.message.includes('UNIQUE')) {
      error(409, 'A game with this title already exists');
    }
    throw err;
  }
};
