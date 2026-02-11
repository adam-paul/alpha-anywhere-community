/**
 * Sign out endpoint
 *
 * Clears the session cookie and redirects to home.
 */

import { redirect } from '@sveltejs/kit';
import { clearSessionCookie } from '$lib/server/session';

import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ cookies }) => {
  clearSessionCookie(cookies);
  throw redirect(302, '/');
};
