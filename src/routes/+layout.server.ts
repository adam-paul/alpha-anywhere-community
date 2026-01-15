/**
 * Root layout server load
 *
 * Passes session to all pages.
 */

import { getSession } from '$lib/server/timeback';

import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = () => {
	const session = getSession();

	return {
		user: session ?? null,
	};
};
