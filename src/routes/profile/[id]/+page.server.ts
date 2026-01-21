/**
 * Profile page server load
 *
 * Fetches user and profile from D1.
 * Handles 'me' as a special ID that resolves to the current user.
 */

import { error, redirect } from '@sveltejs/kit';
import { createDbClient } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, platform }) => {
	const { id } = params;

	// Handle 'me' → redirect to actual user ID (or show error if not logged in)
	if (id === 'me') {
		if (!locals.user) {
			redirect(302, '/');
		}

		if (!platform?.env?.DB) {
			error(503, 'Database not available');
		}

		const db = createDbClient(platform.env.DB);
		const dbUser = await db.users.findByTimebackId(locals.user.id);

		if (!dbUser) {
			error(404, 'User not found');
		}

		// Redirect to canonical URL with actual ID
		redirect(302, `/profile/${dbUser.id}`);
	}

	// Fetch user by D1 internal ID
	if (!platform?.env?.DB) {
		error(503, 'Database not available');
	}

	const db = createDbClient(platform.env.DB);
	const dbUser = await db.users.findById(id);

	if (!dbUser) {
		error(404, 'User not found');
	}

	const dbProfile = await db.profiles.findByUserId(dbUser.id);

	// Check if this is the current user's own profile
	const isOwnProfile = locals.user?.id === dbUser.timeback_id;

	return {
		user: {
			id: dbUser.id,
			displayName: dbUser.display_name,
			email: dbUser.email,
			createdAt: dbUser.created_at
		},
		profile: dbProfile
			? {
					bio: dbProfile.bio,
					location: dbProfile.location,
					avatarUrl: dbProfile.avatar_url,
					coverUrl: dbProfile.cover_url,
					interests: dbProfile.interests ? JSON.parse(dbProfile.interests) : []
				}
			: {
					bio: null,
					location: null,
					avatarUrl: null,
					coverUrl: null,
					interests: []
				},
		isOwnProfile
	};
};
