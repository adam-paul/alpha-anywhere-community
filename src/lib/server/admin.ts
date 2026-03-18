/**
 * Admin authorization utility.
 *
 * Call after verifying the user is authenticated (locals.user is non-null).
 * Throws 403 if the user does not have admin role.
 */

import { error } from '@sveltejs/kit';
import type { UserContext } from '$lib/types';

export function assertAdmin(user: UserContext): void {
  if (user.role !== 'admin') {
    error(403, 'Admin access required');
  }
}
