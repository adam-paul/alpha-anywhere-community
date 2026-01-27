/**
 * Profile API endpoint
 *
 * PATCH - Update current user's profile
 */

import { json, error } from '@sveltejs/kit';
import { createDbClient } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ request, locals, platform }) => {
	// Must be authenticated
	if (!locals.user) {
		error(401, 'Not authenticated');
	}

	if (!platform?.env?.DB) {
		error(503, 'Database not available');
	}

	const db = createDbClient(platform.env.DB);

	// Get the user's internal ID (by email, stable across Cognito pools)
	const dbUser = await db.users.findByEmail(locals.user.email);
	if (!dbUser) {
		error(404, 'User not found');
	}

	// Parse and validate request body
	const body = await request.json();
	const { bio, location, interests } = body;

	// Validate interests is an array of strings if provided
	if (interests !== undefined) {
		if (!Array.isArray(interests) || !interests.every((i) => typeof i === 'string')) {
			error(400, 'Interests must be an array of strings');
		}
	}

	// Update the profile
	const updatedProfile = await db.profiles.upsert(dbUser.id, {
		bio: bio ?? undefined,
		location: location ?? undefined,
		interests: interests ?? undefined
	});

	return json({
		success: true,
		profile: {
			bio: updatedProfile.bio,
			location: updatedProfile.location,
			interests: updatedProfile.interests ? JSON.parse(updatedProfile.interests) : []
		}
	});
};
