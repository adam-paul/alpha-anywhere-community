import {
  COOKIE_NAME,
  extractCookieFromHeader,
  parseSignedCookieValue
} from '@alpha/shared/session';
import type { Env, SessionUser } from './types';

export { RealtimeChannel } from './channel';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Expect: /channel/{channelId}
    const url = new URL(request.url);
    const match = url.pathname.match(/^\/channel\/(.+)$/);
    if (!match) {
      return new Response('Not found', { status: 404 });
    }

    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 });
    }

    // Authenticate via session cookie (shared across *.alpha-community.school)
    const user = await getUserFromCookie(request, env.SESSION_SECRET);
    if (!user) {
      return new Response('Not authenticated', { status: 401 });
    }

    // Forward to DO with user metadata
    const channelId = match[1];
    const id = env.CHANNEL.idFromName(channelId);
    const stub = env.CHANNEL.get(id);

    const doUrl = new URL(request.url);
    doUrl.searchParams.set('userId', user.id);
    doUrl.searchParams.set('displayName', user.displayName);

    return stub.fetch(doUrl.toString(), request);
  }
};

async function getUserFromCookie(request: Request, secret: string): Promise<SessionUser | null> {
  const value = extractCookieFromHeader(request.headers.get('cookie'), COOKIE_NAME);
  if (!value) return null;
  return parseSignedCookieValue<SessionUser>(value, secret);
}
