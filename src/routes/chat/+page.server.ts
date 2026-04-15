import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/**
 * Auth guard for /chat. Conversation and friend data are loaded at
 * `+layout.server.ts` since the sidebar badge and any future cross-route
 * chat surfaces need them outside this route.
 */
export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) redirect(302, '/');
  return {};
};
