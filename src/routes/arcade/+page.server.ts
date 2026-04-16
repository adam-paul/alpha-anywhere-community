import type { PageServerLoad } from './$types';
import { createDbClient, type DbClient } from '$lib/server/db/client';
import { transformGame } from '$lib/server/games';
import type { Game, GatingState } from '$lib/types';
import type { GatingResponse } from '@alpha/shared/types';
import { env } from '$env/dynamic/private';
import { fetchTimebackDailyXp } from '$lib/server/timeback';
import { TIMEBACK_DAILY_XP_REQUIRED } from '$lib/constants';

const DEFAULT_UNLOCKED: GatingState = {
  mode: 'weekly',
  isUnlocked: true,
  progressCurrent: 300,
  progressRequired: 300
};

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

async function fetchTimebackGating(email: string, timezone?: string): Promise<GatingState> {
  try {
    const dailyXp = await fetchTimebackDailyXp(email, timezone);
    return {
      mode: 'daily',
      isUnlocked: dailyXp >= TIMEBACK_DAILY_XP_REQUIRED,
      progressCurrent: dailyXp,
      progressRequired: TIMEBACK_DAILY_XP_REQUIRED,
      source: 'timeback'
    };
  } catch (err) {
    console.error('Timeback gating error:', err);
    return {
      mode: 'daily',
      isUnlocked: true,
      progressCurrent: 120,
      progressRequired: 120,
      source: 'timeback'
    };
  }
}

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
      progressCurrent: data.weekly_active_minutes,
      progressRequired: data.threshold,
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
 * 2. If 'timeback' → fetch Timeback daily XP
 * 3. If 'lwai' → fetch LWAI weekly active minutes
 * 4. If null → probe LWAI to detect source, cache result, then gate accordingly
 */
async function fetchGatingData(
  email: string,
  db: DbClient,
  timezone?: string
): Promise<GatingState> {
  let cachedSource: 'lwai' | 'timeback' | null = null;
  try {
    const user = await db.users.findByEmail(email);
    cachedSource = user?.gating_source ?? null;
  } catch {
    // DB read failed — fall through to probe
  }

  if (cachedSource === 'timeback') return fetchTimebackGating(email, timezone);
  if (cachedSource === 'lwai') return fetchLwaiGating(email);

  const isLwai = await probeIsLwaiStudent(email);
  const source = isLwai ? 'lwai' : 'timeback';

  db.users
    .setGatingSource(email, source)
    .catch((err) => console.error('Failed to cache gating source:', err));

  return source === 'timeback' ? fetchTimebackGating(email, timezone) : fetchLwaiGating(email);
}

export const load: PageServerLoad = async ({ platform, locals, cookies }) => {
  const games: Game[] = [];
  const db = platform?.env?.DB ? createDbClient(platform.env.DB) : null;

  if (db) {
    const isAdmin = locals.user?.role === 'admin';
    const dbGames = isAdmin ? await db.games.findAllAdmin() : await db.games.findAll();
    const transformed = await Promise.all(dbGames.map(transformGame));
    games.push(...transformed);
  }

  let robloxLinked = false;
  if (db && locals.user) {
    const profile = await db.profiles.findByUserId(locals.user.id);
    robloxLinked = !!profile?.roblox_user_id;
  }

  return {
    games,
    gatingState:
      locals.user?.email && db
        ? fetchGatingData(locals.user.email, db, cookies.get('tz') || undefined)
        : Promise.resolve(DEFAULT_UNLOCKED),
    isAdmin: locals.user?.role === 'admin',
    robloxLinked
  };
};
