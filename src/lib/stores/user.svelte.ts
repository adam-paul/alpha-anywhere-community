import { getContext, setContext } from 'svelte';
import type { UserContext, UserState } from '$lib/types';

const USER_CONTEXT_KEY = 'user';

export function createUserStore(initialUser?: UserContext | null) {
  // Use session from server, null if not authenticated
  let user = $state<UserContext | null>(initialUser ?? null);

  const store: UserState = {
    get user() {
      return user;
    },
    get isAuthenticated() {
      return user !== null;
    },
    setUser(value: UserContext | null) {
      user = value;
    },
    logout() {
      user = null;
    }
  };

  setContext(USER_CONTEXT_KEY, store);
  return store;
}

export function getUserStore(): UserState {
  const store = getContext<UserState>(USER_CONTEXT_KEY);
  if (!store) {
    throw new Error(
      'User store not found. Ensure createUserStore() is called in a parent component.'
    );
  }
  return store;
}
