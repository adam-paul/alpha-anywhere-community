export { RealtimeChannel } from './channel';

interface Env {
  CHANNEL: DurableObjectNamespace;
  SESSION_SECRET: string;
}

interface SessionUser {
  id: string;
  displayName: string;
}

const COOKIE_NAME = 'alpha_session';

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

    // Authenticate via session cookie (same domain, sent automatically)
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
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';').map((c) => c.trim());
  const sessionCookie = cookies.find((c) => c.startsWith(`${COOKIE_NAME}=`));
  if (!sessionCookie) return null;

  const value = sessionCookie.substring(COOKIE_NAME.length + 1);
  return verifySession(value, secret);
}

async function verifySession(value: string, secret: string): Promise<SessionUser | null> {
  try {
    const [dataB64, signature] = value.split('.');
    if (!dataB64 || !signature) return null;

    const expectedSig = await sign(dataB64, secret);
    if (signature !== expectedSig) return null;

    const data = JSON.parse(atob(dataB64));
    return { id: data.id, displayName: data.displayName };
  } catch {
    return null;
  }
}

async function sign(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}
