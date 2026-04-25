import { getContext, setContext } from 'svelte';
import { browser } from '$app/environment';
import type { Theme, ThemeStore } from '$lib/types';

// App-wide theme store. Factory + context pattern (matches arcade/user/chat stores).
// Initial value comes from +layout.server.ts (server-resolved cookie).
// Writes persist to cookie so the next request's SSR sees the new preference.

const THEME_CONTEXT_KEY = 'theme';
const COOKIE_NAME = 'theme';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export function createThemeStore(initial: Theme): ThemeStore {
  let theme = $state<Theme>(initial);

  const store: ThemeStore = {
    get theme() {
      return theme;
    },
    set theme(value: Theme) {
      theme = value;
      if (browser) {
        document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
      }
    }
  };

  setContext(THEME_CONTEXT_KEY, store);
  return store;
}

export function getThemeStore(): ThemeStore {
  const store = getContext<ThemeStore>(THEME_CONTEXT_KEY);
  if (!store) {
    throw new Error(
      'Theme store not found. Ensure createThemeStore() is called in a parent component.'
    );
  }
  return store;
}
