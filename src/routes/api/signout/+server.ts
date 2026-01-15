/**
 * Sign out endpoint
 *
 * Clears the session and redirects to home.
 */

import { redirect } from '@sveltejs/kit';
import { clearSession } from '$lib/server/timeback';

import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => {
	clearSession();
	throw redirect(302, '/');
};
