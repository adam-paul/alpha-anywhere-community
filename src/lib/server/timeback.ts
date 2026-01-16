/**
 * Timeback SDK server configuration
 *
 * Handles SSO authentication with cookie-based sessions.
 * Uses Playcademy's production credentials (with permission).
 */

import { createIdentityServer } from 'timeback';
import { AWS_COGNITO_CLIENT_ID, AWS_COGNITO_CLIENT_SECRET } from '$env/static/private';
import { createSessionCookieHeader, getSessionFromRequest } from './session';
import type { UserContext } from '$lib/types';

/**
 * Timeback Identity Server instance
 *
 * Uses createIdentityServer for SSO-only (no timeback.config.ts required).
 * env: 'production' sets the default Cognito issuer for Playcademy prod.
 */
export const timeback = createIdentityServer({
	env: 'production',
	identity: {
		mode: 'sso',
		clientId: AWS_COGNITO_CLIENT_ID,
		clientSecret: AWS_COGNITO_CLIENT_SECRET,
		redirectUri: 'http://localhost:5174/api/auth/sso/callback/timeback',

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
