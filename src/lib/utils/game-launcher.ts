/**
 * Game launcher utility - handles launching games via protocol URLs.
 */

import type { LaunchOptions } from '../types';

interface LaunchResult {
	success: boolean;
	method: 'protocol' | 'web' | 'iframe';
	error?: string;
}

/**
 * Build the deep link URL for a Roblox private server.
 */
function getPrivateServerDeepLink(placeId: string, accessCode: string, linkCode: string): string {
	return `roblox://placeId=${placeId}&accessCode=${accessCode}&linkCode=${linkCode}`;
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
	switch (options.type) {
		case 'roblox': {
			const deepLink = getPrivateServerDeepLink(options.placeId, options.accessCode, options.linkCode);
			window.location.href = deepLink;
			return { success: true, method: 'protocol' };
		}

		case 'web':
			return launchWeb(options.launchUrl);

		case 'minecraft':
			return launchWeb(options.launchUrl);

		case 'iframe':
			// Iframe games are handled by the parent component
			return { success: true, method: 'iframe' };
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