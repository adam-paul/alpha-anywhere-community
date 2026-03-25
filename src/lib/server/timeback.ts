/**
 * Timeback SDK server configuration
 *
 * Handles SSO authentication with cookie-based sessions.
 * Uses createTimebackIdentity (edge-compatible, identity-only) for SSO.
 * Uses EdubridgeClient directly for XP analytics (the full createTimeback
 * requires a config file which isn't available on Cloudflare's edge runtime).
 *
 * Lazy-initialized on first request so the server starts even if auth
 * secrets aren't configured (local dev without SSO).
 */

import { createTimebackIdentity } from '@timeback/sdk/identity';
import { EdubridgeClient, aggregateActivityMetrics } from '@timeback/edubridge';
import { env } from '$env/dynamic/private';
import { createSessionCookieHeader, getSessionFromRequest } from './session';
import type { UserContext } from '$lib/types';

/**
 * Lazy-initialized EdubridgeClient for analytics API calls.
 * Handles its own M2M auth internally (token acquisition, caching, refresh).
 */
let _edubridge: InstanceType<typeof EdubridgeClient>;

function getEdubridgeClient() {
  if (!_edubridge) {
    _edubridge = new EdubridgeClient({
      env: 'production',
      auth: {
        clientId: env.TIMEBACK_API_CLIENT_ID!,
        clientSecret: env.TIMEBACK_API_CLIENT_SECRET!
      }
    });
  }
  return _edubridge;
}

/**
 * Fetch a student's total XP earned today via the EduBridge Analytics API.
 */
export async function fetchTimebackDailyXp(email: string): Promise<number> {
  const client = getEdubridgeClient();
  const today = new Date().toISOString().slice(0, 10);
  const activity = await client.analytics.getActivity({
    email,
    startDate: `${today}T00:00:00.000Z`,
    endDate: `${today}T23:59:59.999Z`,
    timezone: 'America/Chicago'
  });
  const { totalXp } = aggregateActivityMetrics(activity);
  return totalXp;
}

/**
 * Get M2M access token using client credentials flow.
 */
async function getM2MToken(): Promise<string> {
  if (!env.TIMEBACK_API_CLIENT_ID || !env.TIMEBACK_API_CLIENT_SECRET) {
    throw new Error('M2M credentials not configured');
  }

  const credentials = btoa(`${env.TIMEBACK_API_CLIENT_ID}:${env.TIMEBACK_API_CLIENT_SECRET}`);

  const response = await fetch(env.TIMEBACK_API_TOKEN_URL!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${credentials}`
    },
    body: 'grant_type=client_credentials'
  });

  if (!response.ok) {
    throw new Error(`M2M token request failed: ${response.status}`);
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

/**
 * Resolve Timeback ID (OneRoster sourcedId) by email.
 */
async function resolveTimebackId(email: string): Promise<string | undefined> {
  try {
    const token = await getM2MToken();

    const url = `${env.TIMEBACK_API_URL}/ims/oneroster/rostering/v1p2/users?filter=email='${encodeURIComponent(email)}'&limit=1`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json'
      }
    });

    if (!response.ok) {
      return undefined;
    }

    const data = (await response.json()) as { users?: Array<{ sourcedId: string }> };

    if (data.users && data.users.length > 0) {
      return data.users[0].sourcedId;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Timeback Identity instance (edge-compatible), lazy-initialized.
 *
 * Identity-only mode: handles SSO sign-in/callback/sign-out.
 * Resolves Timeback ID via M2M OneRoster lookup in the callback.
 * Does not support user.verify or user.me — those require the full
 * createTimeback which needs filesystem access for timeback.config.json.
 */
let _timeback: ReturnType<typeof createTimebackIdentity>;

export function getTimeback() {
  if (!_timeback) {
    _timeback = createTimebackIdentity({
      env: 'production',
      identity: {
        mode: 'sso',
        clientId: env.AWS_COGNITO_CLIENT_ID!,
        clientSecret: env.AWS_COGNITO_CLIENT_SECRET!,
        issuer: env.AWS_COGNITO_ISSUER!,
        redirectUri: env.AUTH_CALLBACK_URL!,

        buildState: ({ url }) => ({
          returnTo: url.searchParams.get('returnTo') ?? '/'
        }),

        onCallbackSuccess: async ({ user, state, redirect }) => {
          const email = user.email ?? '';
          const timebackId = await resolveTimebackId(email);

          if (!timebackId) {
            console.warn(`Could not resolve Timeback ID for ${email}, using Cognito sub`);
          }

          const tbId = timebackId ?? user.sub;
          const session: UserContext = {
            id: tbId, // Temporary — hooks.server.ts replaces with D1 ID on next request
            timebackId: tbId,
            email,
            displayName: user.name ?? email.split('@')[0] ?? 'User',
            role: 'student'
          };

          const cookieHeader = await createSessionCookieHeader(session, env.AUTH_CALLBACK_URL);
          const returnTo = (state as { returnTo?: string })?.returnTo ?? '/';

          return redirect(returnTo, {
            'Set-Cookie': cookieHeader
          });
        },

        onCallbackError: ({ redirect }) => {
          return redirect('/?error=sso_failed');
        },

        getUser: async (req) => {
          const session = await getSessionFromRequest(req);
          if (!session) return undefined;
          return { id: session.timebackId, email: session.email, name: session.displayName };
        }
      }
    });
  }
  return _timeback;
}
