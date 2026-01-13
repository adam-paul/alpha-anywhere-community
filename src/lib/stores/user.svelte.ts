import { getContext, setContext } from 'svelte';
import type { UserContext } from '../types';
import { MOCK_USER } from '../mock-data';

const USER_CONTEXT_KEY = 'user';

export interface UserState {
  user: UserContext;
}

export function createUserStore() {
  // For now, use mock user. In the future, this would come from auth.
  let user = $state<UserContext>(MOCK_USER);

  const store: UserState = {
    get user() { return user; },
    set user(value) { user = value; }
  };

  setContext(USER_CONTEXT_KEY, store);
  return store;
}

export function getUserStore(): UserState {
  const store = getContext<UserState>(USER_CONTEXT_KEY);
  if (!store) {
    throw new Error('User store not found. Ensure createUserStore() is called in a parent component.');
  }
  return store;
}
