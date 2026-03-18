/**
 * Admin game management — update + delete
 *
 * PATCH  - Update a game (partial, encrypts credentials if provided)
 * DELETE - Delete a game
 */

import { json, error } from '@sveltejs/kit';
import { createDbClient } from '$lib/server/db/client';
import { assertAdmin } from '$lib/server/admin';
import { encrypt } from '$lib/server/crypto';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';
import type { UpdateGameInput } from '$lib/server/db/types';

export const PATCH: RequestHandler = async ({ request, params, locals, platform }) => {
  if (!locals.user) error(401, 'Not authenticated');
  assertAdmin(locals.user);
  if (!platform?.env?.DB) error(503, 'Database not available');

  const body = await request.json();
  const db = createDbClient(platform.env.DB);

  const existing = await db.games.findById(params.id);
  if (!existing) error(404, 'Game not found');

  const update: UpdateGameInput = {};
  if (body.title !== undefined) update.title = body.title;
  if (body.type !== undefined) update.type = body.type;
  if (body.engagementCategory !== undefined) update.engagement_category = body.engagementCategory;
  if (body.launchUrl !== undefined) update.launch_url = body.launchUrl;
  if (body.thumbnailUrl !== undefined) update.thumbnail_url = body.thumbnailUrl || null;
  if (body.placeId !== undefined) update.place_id = body.placeId || null;
  if (body.description !== undefined) update.description = body.description || null;
  if (body.isActive !== undefined) update.is_active = body.isActive ? 1 : 0;

  // Credentials: only update if non-empty value provided (blank = keep existing)
  const key = env.GAME_CREDENTIALS_KEY;
  if (body.accessCode) {
    update.private_server_access_code = key ? await encrypt(body.accessCode, key) : body.accessCode;
  }
  if (body.linkCode) {
    update.link_code = key ? await encrypt(body.linkCode, key) : body.linkCode;
  }

  const game = await db.games.update(params.id, update);
  return json({ success: true, game });
};

export const DELETE: RequestHandler = async ({ params, locals, platform }) => {
  if (!locals.user) error(401, 'Not authenticated');
  assertAdmin(locals.user);
  if (!platform?.env?.DB) error(503, 'Database not available');

  const db = createDbClient(platform.env.DB);
  await db.games.delete(params.id);
  return json({ success: true });
};
