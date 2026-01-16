/**
 * Root layout server load
 *
 * Passes session to all pages via event.locals (populated in hooks.server.ts).
 */

import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => {
	return {
		user: locals.user
	};
};
