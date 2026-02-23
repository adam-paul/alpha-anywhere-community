import type { PageServerLoad } from './$types';
import { createDbClient, type DbClient } from '$lib/server/db/client';
import type { Game, GatingResponse, GatingState } from '$lib/types';
import type { DbGame } from '$lib/server/db/types';
import { decrypt } from '$lib/server/crypto';
import { env } from '$env/dynamic/private';

const DEFAULT_UNLOCKED: GatingState = {
  mode: 'weekly',
  isUnlocked: true,
  minutesCurrent: 300,
  minutesRequired: 300
};

/**
 * Probe LWAI to check if a student exists in the CoachBot database.
 * Returns true if the student has any historical data.
 */
async function probeIsLwaiStudent(email: string): Promise<boolean> {
  if (!env.LWAI_PROXY_URL || !env.LWAI_API_KEY) return false;

  try {
    const response = await fetch(`${env.LWAI_PROXY_URL}/probe?email=${encodeURIComponent(email)}`, {
      headers: { 'x-api-key': env.LWAI_API_KEY }
    });

    if (!response.ok) return false;

    const data = (await response.json()) as { exists: boolean };
    return data.exists;
  } catch {
    return false;
  }
}

/**
 * Fetch LWAI gating data (weekly active minutes).
 */
async function fetchLwaiGating(email: string): Promise<GatingState> {
  if (!env.LWAI_PROXY_URL || !env.LWAI_API_KEY) return DEFAULT_UNLOCKED;

  try {
    const response = await fetch(
      `${env.LWAI_PROXY_URL}/gating?email=${encodeURIComponent(email)}`,
      { headers: { 'x-api-key': env.LWAI_API_KEY } }
    );

    if (!response.ok) {
      console.error('LWAI proxy error:', response.status);
      return DEFAULT_UNLOCKED;
    }

    const data: GatingResponse = await response.json();
    return {
      mode: 'weekly',
      isUnlocked: data.eligible,
      minutesCurrent: data.weekly_active_minutes,
      minutesRequired: data.threshold,
      source: 'lwai'
    };
  } catch (err) {
    console.error('LWAI proxy fetch error:', err);
    return DEFAULT_UNLOCKED;
  }
}

/**
 * Resolve gating data for a student.
 *
 * 1. Check cached gating_source in D1
 * 2. If 'timeback' → default unlocked (XP API not yet available)
 * 3. If 'lwai' → fetch LWAI gating data
 * 4. If null → probe LWAI to detect source, cache result, then gate accordingly
 */
async function fetchGatingData(email: string, db: DbClient): Promise<GatingState> {
  // Check cached gating source
  let cachedSource: 'lwai' | 'timeback' | null = null;
  try {
    const user = await db.users.findByEmail(email);
    cachedSource = user?.gating_source ?? null;
  } catch {
    // DB read failed — fall through to probe
  }

  if (cachedSource === 'timeback') {
    return { ...DEFAULT_UNLOCKED, source: 'timeback' };
  }

  if (cachedSource === 'lwai') {
    return fetchLwaiGating(email);
  }

  // Unknown source — probe LWAI to detect
  const isLwai = await probeIsLwaiStudent(email);
  const source = isLwai ? 'lwai' : 'timeback';

  // Cache the result (fire and forget)
  db.users
    .setGatingSource(email, source)
    .catch((err) => console.error('Failed to cache gating source:', err));

  if (source === 'timeback') {
    return { ...DEFAULT_UNLOCKED, source: 'timeback' };
  }

  return fetchLwaiGating(email);
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
  const db = platform?.env?.DB ? createDbClient(platform.env.DB) : null;

  // Fetch games from DB if available (fast)
  if (db) {
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
    gatingState:
      locals.user?.email && db
        ? fetchGatingData(locals.user.email, db)
        : Promise.resolve(DEFAULT_UNLOCKED)
  };
};
