/**
 * Game launcher utility - handles launching games from protocol URLs
 * with appropriate fallbacks for different platforms and game types.
 */

export type GameType = 'roblox' | 'minecraft' | 'web' | 'iframe';

interface LaunchOptions {
	launchUrl: string;
	type: GameType;
	gameId: string;
}

interface LaunchResult {
	success: boolean;
	method: 'protocol' | 'web' | 'iframe';
	error?: string;
}

/**
 * Extract Roblox place ID from a roblox:// protocol URL
 * e.g., "roblox://placeId=1537690962" -> "1537690962"
 */
function extractRobloxPlaceId(protocolUrl: string): string | null {
	const match = protocolUrl.match(/placeId=(\d+)/);
	return match ? match[1] : null;
}

/**
 * Get the Roblox.com web URL for a place ID
 */
function getRobloxWebUrl(placeId: string): string {
	return `https://www.roblox.com/games/${placeId}`;
}

/**
 * Attempt to launch via protocol handler with visibility-based detection.
 * Returns a promise that resolves when we detect success or timeout.
 */
function tryProtocolLaunch(protocolUrl: string, timeoutMs: number = 2500): Promise<boolean> {
	return new Promise((resolve) => {
		let resolved = false;
		let iframe: HTMLIFrameElement | null = null;

		const cleanup = () => {
			if (iframe && iframe.parentNode) {
				iframe.parentNode.removeChild(iframe);
			}
			document.removeEventListener('visibilitychange', handleVisibilityChange);
			window.removeEventListener('blur', handleBlur);
		};

		const handleSuccess = () => {
			if (!resolved) {
				resolved = true;
				cleanup();
				resolve(true);
			}
		};

		const handleTimeout = () => {
			if (!resolved) {
				resolved = true;
				cleanup();
				resolve(false);
			}
		};

		// Visibility change indicates app opened and took focus
		const handleVisibilityChange = () => {
			if (document.hidden) {
				handleSuccess();
			}
		};

		// Window blur also indicates another app took focus
		const handleBlur = () => {
			// Small delay to avoid false positives from clicking
			setTimeout(() => {
				if (!resolved && !document.hasFocus()) {
					handleSuccess();
				}
			}, 100);
		};

		// Set up listeners
		document.addEventListener('visibilitychange', handleVisibilityChange);
		window.addEventListener('blur', handleBlur);

		// Create hidden iframe to trigger protocol
		iframe = document.createElement('iframe');
		iframe.style.display = 'none';
		iframe.src = protocolUrl;
		document.body.appendChild(iframe);

		// Fallback timeout
		setTimeout(handleTimeout, timeoutMs);
	});
}

/**
 * Launch a Roblox game - tries protocol first, falls back to web
 */
async function launchRoblox(launchUrl: string): Promise<LaunchResult> {
	const placeId = extractRobloxPlaceId(launchUrl);

	if (!placeId) {
		return {
			success: false,
			method: 'protocol',
			error: `Invalid Roblox launch URL: ${launchUrl}`
		};
	}

	// Try protocol handler first
	const protocolWorked = await tryProtocolLaunch(launchUrl);

	if (protocolWorked) {
		return { success: true, method: 'protocol' };
	}

	// Fallback: open Roblox.com game page
	const webUrl = getRobloxWebUrl(placeId);
	window.open(webUrl, '_blank');

	return { success: true, method: 'web' };
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
export async function launchGame(options: LaunchOptions): Promise<LaunchResult> {
	const { launchUrl, type } = options;

	switch (type) {
		case 'roblox':
			return launchRoblox(launchUrl);

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
