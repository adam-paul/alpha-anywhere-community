/**
 * Game launcher utility - handles launching games via protocol URLs.
 */

export type GameType = 'roblox' | 'minecraft' | 'web' | 'iframe';

interface LaunchOptions {
	launchUrl: string;
	type: GameType;
	gameId: string;
	privateServerShareCode?: string;
}

interface LaunchResult {
	success: boolean;
	method: 'protocol' | 'web' | 'iframe';
	error?: string;
}

/**
 * Build the deep link URL for a private server share code.
 * Format discovered from Roblox's ShareLinks JavaScript bundle.
 * @see https://devforum.roblox.com/t/parsing-deeplink-information-from-a-private-server-link-with-the-newer-format/3464724
 */
function getPrivateServerDeepLink(shareCode: string): string {
	return `roblox://navigation/share_links?code=${shareCode}&type=Server`;
}

/**
 * Launch a Roblox private server via deep link.
 * Requires a private server share code - no public server fallback for safety.
 */
function launchRoblox(privateServerShareCode?: string): LaunchResult {
	if (!privateServerShareCode) {
		return {
			success: false,
			method: 'protocol',
			error: 'Private server share code is required. Public servers are not supported.'
		};
	}

	const deepLink = getPrivateServerDeepLink(privateServerShareCode);
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
	const { launchUrl, type, privateServerShareCode } = options;

	switch (type) {
		case 'roblox':
			return launchRoblox(privateServerShareCode);

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
