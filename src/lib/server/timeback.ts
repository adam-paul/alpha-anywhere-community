/**
 * Timeback SDK server configuration
 *
 * Handles SSO authentication with cookie-based sessions.
 * Uses edge-compatible createTimebackIdentity for SSO, plus direct
 * OneRoster API calls for M2M user lookup (since @timeback/core isn't edge-compatible).
 */

import { createTimebackIdentity } from '@timeback/sdk/edge';
import {
	AWS_COGNITO_CLIENT_ID,
	AWS_COGNITO_CLIENT_SECRET,
	AWS_COGNITO_ISSUER,
	AUTH_CALLBACK_URL,
	TIMEBACK_API_CLIENT_ID,
	TIMEBACK_API_CLIENT_SECRET,
	TIMEBACK_API_TOKEN_URL,
	TIMEBACK_API_URL
} from '$env/static/private';
import { createSessionCookieHeader, getSessionFromRequest } from './session';
import type { UserContext } from '$lib/types';

/**
 * Get M2M access token using client credentials flow.
 */
async function getM2MToken(): Promise<string> {
	if (!TIMEBACK_API_CLIENT_ID || !TIMEBACK_API_CLIENT_SECRET) {
		throw new Error('M2M credentials not configured');
	}

	const credentials = btoa(`${TIMEBACK_API_CLIENT_ID}:${TIMEBACK_API_CLIENT_SECRET}`);

	const response = await fetch(TIMEBACK_API_TOKEN_URL, {
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

		const url = `${TIMEBACK_API_URL}/ims/oneroster/rostering/v1p2/users?filter=email='${encodeURIComponent(email)}'&limit=1`;

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
 * Timeback Identity instance (edge-compatible)
 *
 * Uses createTimebackIdentity for SSO, then resolves Timeback ID via
 * M2M OneRoster lookup in the callback.
 */
export const timeback = createTimebackIdentity({
	env: 'staging',
	identity: {
		mode: 'sso',
		clientId: AWS_COGNITO_CLIENT_ID,
		clientSecret: AWS_COGNITO_CLIENT_SECRET,
		issuer: AWS_COGNITO_ISSUER,
		redirectUri: AUTH_CALLBACK_URL,

		buildState: ({ url }) => ({
			returnTo: url.searchParams.get('returnTo') ?? '/'
		}),

		onCallbackSuccess: async ({ user, state, redirect }) => {
			const email = user.email ?? '';
			const timebackId = await resolveTimebackId(email);

			if (!timebackId) {
				console.warn(`Could not resolve Timeback ID for ${email}, using Cognito sub`);
			}

			const session: UserContext = {
				id: timebackId ?? user.sub,
				email,
				displayName: user.name ?? email.split('@')[0] ?? 'User'
			};

			const cookieHeader = await createSessionCookieHeader(session);
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
			return { id: session.id, email: session.email, name: session.displayName };
		}
	}
});
