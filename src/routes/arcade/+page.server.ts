import type { PageServerLoad } from './$types';
import { createDbClient } from '$lib/server/db/client';
import type { Game, GatingResponse, GatingState } from '$lib/types';
import type { DbGame } from '$lib/server/db/types';
import { decrypt } from '$lib/server/crypto';
import { env } from '$env/dynamic/private';

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

/**
 * Decrypt game credentials if encryption key is available.
 * Falls back to raw values if no key (local dev without encryption).
 */
async function decryptCredentials(
  game: DbGame,
  key: string | undefined
): Promise<{ accessCode?: string; linkCode?: string }> {
  if (!key) {
    // No encryption key — return raw values (local dev or unencrypted)
    return {
      accessCode: game.private_server_access_code ?? undefined,
      linkCode: game.link_code ?? undefined
    };
  }

  try {
    return {
      accessCode: game.private_server_access_code
        ? await decrypt(game.private_server_access_code, key)
        : undefined,
      linkCode: game.link_code ? await decrypt(game.link_code, key) : undefined
    };
  } catch (err) {
    console.error(`Failed to decrypt credentials for game ${game.id}:`, err);
    return {};
  }
}

export const load: PageServerLoad = async ({ platform, locals }) => {
  const games: Game[] = [];

  // Fetch games from DB if available (fast)
  if (platform?.env?.DB) {
    const db = createDbClient(platform.env.DB);
    const dbGames = await db.games.findAll();
    const credentialsKey = env.GAME_CREDENTIALS_KEY;

    // Transform DB format to client format (decrypt credentials)
    const transformedGames = await Promise.all(
      dbGames.map(async (g) => {
        const creds = await decryptCredentials(g, credentialsKey);
        return {
          id: g.id,
          title: g.title,
          thumbnailUrl: g.thumbnail_url ?? '',
          type: g.type,
          engagementCategory: g.engagement_category,
          launchUrl: g.launch_url,
          placeId: g.place_id ?? undefined,
          accessCode: creds.accessCode,
          linkCode: creds.linkCode,
          description: g.description ?? undefined,
          isActive: g.is_active === 1
        };
      })
    );
    games.push(...transformedGames);
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
