/**
 * Timeback SDK server configuration
 *
 * Handles SSO authentication with cookie-based sessions.
 * Uses Alpha Anywhere Community's dedicated Cognito credentials.
 */

import { createTimebackIdentity } from '@timeback/sdk/edge';
import {
	AWS_COGNITO_CLIENT_ID,
	AWS_COGNITO_CLIENT_SECRET,
	AWS_COGNITO_ISSUER,
	AUTH_CALLBACK_URL
} from '$env/static/private';
import { createSessionCookieHeader, getSessionFromRequest } from './session';
import type { UserContext } from '$lib/types';

/**
 * Timeback Identity instance
 *
 * Uses createTimebackIdentity for SSO-only (no timeback.config.ts required).
 * Issuer points to Alpha Anywhere Community's Cognito user pool.
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
			const session: UserContext = {
				id: user.sub,
				email: user.email ?? '',
				displayName: user.name ?? user.email?.split('@')[0] ?? 'User'
			};

			const cookieHeader = await createSessionCookieHeader(session);
			const returnTo = (state as { returnTo?: string })?.returnTo ?? '/';

			return redirect(returnTo, {
				'Set-Cookie': cookieHeader
			});
		},

		onCallbackError: ({ error, redirect }) => {
			console.error('SSO Error:', error.message);
			return redirect('/?error=sso_failed');
		},

		getUser: async (req) => {
			const session = await getSessionFromRequest(req);
			if (!session) return undefined;
			return { id: session.id, email: session.email, name: session.displayName };
		}
	}
});
