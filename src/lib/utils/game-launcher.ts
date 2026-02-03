/**
 * Game launcher utility - handles launching games via protocol URLs.
 */

export type GameType = 'roblox' | 'minecraft' | 'web' | 'iframe';

interface LaunchOptions {
	type: GameType;
	gameId: string;
	// For Roblox private servers
	placeId?: string;
	accessCode?: string;
	linkCode?: string;
	// For web/iframe games
	launchUrl?: string;
}

interface LaunchResult {
	success: boolean;
	method: 'protocol' | 'web' | 'iframe';
	error?: string;
}

/**
 * Build the deep link URL for a Roblox private server.
 * Requires placeId, accessCode, and linkCode.
 */
function getPrivateServerDeepLink(placeId: string, accessCode: string, linkCode: string): string {
	return `roblox://placeId=${placeId}&accessCode=${accessCode}&linkCode=${linkCode}`;
}

/**
 * Launch a Roblox private server via deep link.
 * Requires placeId, accessCode, and linkCode - no public server fallback for safety.
 */
function launchRoblox(placeId?: string, accessCode?: string, linkCode?: string): LaunchResult {
	if (!placeId || !accessCode || !linkCode) {
		return {
			success: false,
			method: 'protocol',
			error: 'placeId, accessCode, and linkCode are required. Public servers are not supported.'
		};
	}

	const deepLink = getPrivateServerDeepLink(placeId, accessCode, linkCode);
	window.location.href = deepLink;

	return { success: true, method: 'protocol' };
}

/**
 * Launch a web-based game in a new tab
 */
function launchWeb(launchUrl: string): LaunchResult {
	window.open(launchUrl, '_blank');
	return { success: true, method: 'web' };
}

/**
 * Main entry point for launching any game type
 */
export function launchGame(options: LaunchOptions): LaunchResult {
	const { type, placeId, accessCode, linkCode, launchUrl } = options;

	switch (type) {
		case 'roblox':
			return launchRoblox(placeId, accessCode, linkCode);

		case 'web':
			return launchWeb(launchUrl);

		case 'minecraft':
			// Minecraft has its own protocol: minecraft://
			// For now, treat like web - open in browser
			return launchWeb(launchUrl);

		case 'iframe':
			// Iframe games would be handled by the parent component
			// Just return success - the UI will embed it
			return { success: true, method: 'iframe' };

		default:
			return {
				success: false,
				method: 'web',
				error: `Unknown game type: ${type}`
			};
	}
}

/**
 * Check if we're running in Electron (Timeback wrapper)
 * Electron exposes additional capabilities for more reliable launching
 */
export function isElectron(): boolean {
	return typeof window !== 'undefined' && !!(window as any).electron?.isElectron;
}

/**
 * Launch via Electron's shell.openExternal (more reliable than protocol handler)
 * Only works when running in Timeback Electron wrapper
 */
export async function launchViaElectron(url: string): Promise<boolean> {
	if (!isElectron()) return false;

	try {
		await (window as any).electron.launchExternal(url);
		return true;
	} catch {
		return false;
	}
}
