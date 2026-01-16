/**
 * SvelteKit server hooks
 *
 * Routes Timeback auth requests through the SDK handler.
 * Populates event.locals.user from session cookie.
 */

import { building } from '$app/environment';
import { timeback } from '$lib/server/timeback';
import { getSessionFromCookie } from '$lib/server/session';
import { svelteKitHandler } from 'timeback/svelte-kit';

import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	// Populate user from session cookie
	const user = await getSessionFromCookie(event.cookies);
	event.locals.user = user;

	// Let Timeback handle auth routes
	return svelteKitHandler({
		timeback,
		event,
		resolve,
		building,
		callbackPath: '/api/auth/sso/callback/timeback'
	});
};
