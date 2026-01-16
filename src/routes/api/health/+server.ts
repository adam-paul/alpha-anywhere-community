/**
 * Health check endpoint
 *
 * Verifies database connectivity and returns basic stats.
 */

import { createDbClient } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ platform, locals }) => {
	// Check if D1 is available
	if (!platform?.env?.DB) {
		return Response.json(
			{
				status: 'error',
				message: 'Database not available (D1 binding missing)',
				hint: 'Run with: bunx wrangler pages dev .svelte-kit/cloudflare --d1=DB'
			},
			{ status: 503 }
		);
	}

	try {
		const db = createDbClient(platform.env.DB);

		// Simple query to verify connection
		const users = await db.users.findAll(1);

		return Response.json({
			status: 'ok',
			database: 'connected',
			user: locals.user ? { id: locals.user.id, email: locals.user.email } : null,
			stats: {
				userCount: users.length > 0 ? '1+' : '0'
			}
		});
	} catch (error) {
		return Response.json(
			{
				status: 'error',
				message: error instanceof Error ? error.message : 'Unknown database error'
			},
			{ status: 500 }
		);
	}
};
