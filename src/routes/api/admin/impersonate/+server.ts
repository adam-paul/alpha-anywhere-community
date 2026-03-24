/**
 * Impersonation endpoint for multi-user testing.
 *
 * Mints a valid session cookie for any existing D1 user, allowing
 * multi-user testing from a single developer machine. Gated solely
 * behind ALLOW_IMPERSONATION env var (set in .env locally, Pages
 * secrets for preview, never set in production). No auth check —
 * the env var is the security boundary.
 *
 * GET /api/admin/impersonate?userId=test-user-sophia
 */

import { redirect, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { createDbClient } from '$lib/server/db/client';
import { setSessionCookie } from '$lib/server/session';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ platform, url, cookies }) => {
  if (!env.ALLOW_IMPERSONATION) return new Response(null, { status: 404 });
  if (!platform?.env?.DB) error(503, 'Database not available');

  const userId = url.searchParams.get('userId');
  if (!userId) error(400, 'userId query parameter is required');

  const db = createDbClient(platform.env.DB);
  const targetUser = await db.users.findById(userId);
  if (!targetUser) error(404, 'User not found');

  await setSessionCookie(
    cookies,
    {
      id: targetUser.id,
      timebackId: targetUser.timeback_id,
      email: targetUser.email,
      displayName: targetUser.display_name,
      role: targetUser.role
    },
    url.origin
  );

  redirect(302, '/explore');
};
