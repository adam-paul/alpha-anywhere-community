/**
 * Game transformation helpers — shared between arcade index and lobby pages.
 *
 * Turns a raw `DbGame` row into the client-facing `Game` shape and decrypts
 * credential columns. Credentials are encrypted at rest; in local dev without
 * a key, raw values are returned.
 */

import { env } from '$env/dynamic/private';
import { decrypt } from '$lib/server/crypto';
import type { Game } from '$lib/types';
import type { DbGame } from '$lib/server/db/types';

async function decryptCredentials(
  game: DbGame,
  key: string | undefined
): Promise<{ accessCode?: string; linkCode?: string }> {
  if (!key) {
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

export async function transformGame(dbGame: DbGame): Promise<Game> {
  const creds = await decryptCredentials(dbGame, env.GAME_CREDENTIALS_KEY);
  return {
    id: dbGame.id,
    title: dbGame.title,
    thumbnailUrl: dbGame.thumbnail_url ?? '',
    type: dbGame.type,
    engagementCategory: dbGame.engagement_category,
    launchUrl: dbGame.launch_url,
    placeId: dbGame.place_id ?? undefined,
    accessCode: creds.accessCode,
    linkCode: creds.linkCode,
    description: dbGame.description ?? undefined,
    isActive: dbGame.is_active === 1
  };
}
