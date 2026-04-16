import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { createDbClient } from '$lib/server/db/client';
import { transformGame } from '$lib/server/games';

export const load: PageServerLoad = async ({ platform, locals, params }) => {
  if (!locals.user) redirect(302, '/');
  if (!platform?.env?.DB) error(503, 'Database not available');

  const db = createDbClient(platform.env.DB);
  const dbGame = await db.games.findById(params.gameId);

  if (!dbGame) error(404, 'Game not found');
  const isAdmin = locals.user.role === 'admin';
  if (dbGame.is_active !== 1 && !isAdmin) error(404, 'Game not found');

  const game = await transformGame(dbGame);

  const profile = await db.profiles.findByUserId(locals.user.id);
  const robloxLinked = !!profile?.roblox_user_id;

  return {
    game,
    isAdmin,
    robloxLinked
  };
};
