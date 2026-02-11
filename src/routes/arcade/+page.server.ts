import type { PageServerLoad } from './$types';
import { createDbClient } from '$lib/server/db/client';
import type { Game, GatingState } from '$lib/types';
import { env } from '$env/dynamic/private';

interface GatingResponse {
	email: string;
	weekly_active_minutes: number;
	threshold: number;
	eligible: boolean;
}

async function fetchGatingData(email: string): Promise<GatingState> {
	// Default unlocked state for dev or when proxy not configured
	const defaultState: GatingState = {
		mode: 'weekly',
		isUnlocked: true,
		minutesCurrent: 300,
		minutesRequired: 300
	};

	if (!env.LWAI_PROXY_URL || !env.LWAI_API_KEY) {
		return defaultState;
	}

	try {
		const response = await fetch(
			`${env.LWAI_PROXY_URL}/gating?email=${encodeURIComponent(email)}`,
			{
				headers: {
					'x-api-key': env.LWAI_API_KEY
				}
			}
		);

		if (!response.ok) {
			console.error('LWAI proxy error:', response.status);
			return defaultState;
		}

		const data: GatingResponse = await response.json();
		return {
			mode: 'weekly',
			isUnlocked: data.eligible,
			minutesCurrent: data.weekly_active_minutes,
			minutesRequired: data.threshold
		};
	} catch (err) {
		console.error('LWAI proxy fetch error:', err);
		return defaultState;
	}
}

export const load: PageServerLoad = async ({ platform, locals }) => {
	const games: Game[] = [];

	// Fetch games from DB if available (fast)
	if (platform?.env?.DB) {
		const db = createDbClient(platform.env.DB);
		const dbGames = await db.games.findAll();

		// Transform DB format to client format
		games.push(
			...dbGames.map((g) => ({
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
			}))
		);
	}

	// Return games immediately, stream gating data when ready
	// The promise is not awaited, so the page renders instantly
	return {
		games,
		gatingState: locals.user?.email
			? fetchGatingData(locals.user.email)
			: Promise.resolve({
					mode: 'weekly' as const,
					isUnlocked: true,
					minutesCurrent: 300,
					minutesRequired: 300
				})
	};
};
