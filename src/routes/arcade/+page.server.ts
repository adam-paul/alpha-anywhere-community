import type { PageServerLoad } from './$types';
import { createDbClient } from '$lib/server/db/client';
import type { Game } from '$lib/types';

export const load: PageServerLoad = async ({ platform }) => {
	if (!platform?.env?.DB) {
		// Return empty array when DB not available (e.g., Vite-only dev server)
		return { games: [] };
	}

	const db = createDbClient(platform.env.DB);
	const dbGames = await db.games.findAll();

	// Transform DB format to client format
	const games: Game[] = dbGames.map((g) => ({
		id: g.id,
		title: g.title,
		thumbnailUrl: g.thumbnail_url ?? '',
		type: g.type,
		engagementCategory: g.engagement_category,
		launchUrl: g.launch_url,
		placeId: g.place_id ?? undefined,
		accessCode: g.private_server_access_code ?? undefined,
		linkCode: g.link_code ?? undefined,
		description: g.description ?? undefined,
		isActive: g.is_active === 1
	}));

	return { games };
};
