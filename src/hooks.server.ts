/**
 * SvelteKit server hooks
 *
 * Routes Timeback auth requests through the SDK handler.
 */

import { building } from '$app/environment';
import { timeback } from '$lib/server/timeback';
import { svelteKitHandler } from 'timeback/svelte-kit';

import type { Handle } from '@sveltejs/kit';

export const handle: Handle = ({ event, resolve }) => {
	return svelteKitHandler({
		timeback,
		event,
		resolve,
		building,
		callbackPath: '/api/auth/sso/callback/timeback',
	});
};
