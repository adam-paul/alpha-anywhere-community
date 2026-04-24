import { browser } from '$app/environment';
import type { Theme } from '$lib/types';

// App-wide theme preference. Module-level singleton, localStorage-persisted.
// Read by $lib/routes/+layout.svelte (applies to data-theme on .app-root).
// Written by DevTools theme picker.

const STORAGE_KEY = 'theme';
const DEFAULT_THEME: Theme = 'playcademy';

function readStored(): Theme {
  if (!browser) return DEFAULT_THEME;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return (stored as Theme | null) ?? DEFAULT_THEME;
}

function createThemeStore() {
  let theme = $state<Theme>(readStored());

  return {
    get theme(): Theme {
      return theme;
    },
    set theme(value: Theme) {
      theme = value;
      if (browser) {
        window.localStorage.setItem(STORAGE_KEY, value);
      }
    }
  };
}

export const themeStore = createThemeStore();
