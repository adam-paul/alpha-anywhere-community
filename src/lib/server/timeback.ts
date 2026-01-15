/**
 * Timeback SDK server configuration
 *
 * Handles SSO authentication and provides session management.
 * Uses Playcademy's production credentials (with permission).
 */

import { createIdentityServer } from 'timeback';
import { AWS_COGNITO_CLIENT_ID, AWS_COGNITO_CLIENT_SECRET } from '$env/static/private';
import type { UserContext } from '../types';

/**
 * Session store (in-memory for dev)
 * TODO: Replace with cookie-based sessions for production
 */
let session: UserContext | undefined;

export function getSession(): UserContext | undefined {
	return session;
}

export function setSession(user: UserContext | undefined): void {
	session = user;
}

export function clearSession(): void {
	session = undefined;
}

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
			returnTo: url.searchParams.get('returnTo') ?? '/',
		}),

		onCallbackSuccess: ({ user, state, redirect }) => {
			setSession({
				id: user.sub,
				email: user.email ?? '',
				displayName: user.name ?? user.email?.split('@')[0] ?? 'User',
			});
			const returnTo = (state as { returnTo?: string })?.returnTo ?? '/';
			return redirect(returnTo);
		},

		onCallbackError: ({ error, redirect }) => {
			console.error('SSO Error:', error.message);
			return redirect('/?error=sso_failed');
		},

		getUser: () => {
			const s = getSession();
			if (!s) return undefined;
			return { id: s.id, email: s.email, name: s.displayName };
		},
	},
});
