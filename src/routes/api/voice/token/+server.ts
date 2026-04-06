import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { AccessToken } from 'livekit-server-sdk';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, request }) => {
  if (!locals.user) error(401, 'Not authenticated');

  const { roomName } = (await request.json()) as { roomName: string };
  if (!roomName?.trim()) error(400, 'roomName is required');

  if (!env.LIVEKIT_API_KEY || !env.LIVEKIT_API_SECRET) {
    error(503, 'LiveKit not configured');
  }

  const token = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, {
    identity: locals.user.id,
    name: locals.user.displayName,
    ttl: 3600
  });

  token.addGrant({
    roomJoin: true,
    room: roomName.trim(),
    canPublish: true,
    canSubscribe: true
  });

  return json({ token: await token.toJwt() });
};
