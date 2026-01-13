import { getContext, setContext } from 'svelte';
import type { EngagementCategory, Game, GatingState, Theme } from '../types';
import { MOCK_GAMES, MOCK_USER } from '../mock-data';

const ARCADE_CONTEXT_KEY = 'arcade';

export interface ArcadeState {
  // Gating
  gatingState: GatingState;

  // Filter
  activeFilter: EngagementCategory | 'all';

  // Theme
  theme: Theme;

  // Games (derived based on filter)
  readonly games: Game[];
  readonly filteredGames: Game[];
}

export function createArcadeStore() {
  let gatingState = $state<GatingState>({
    mode: 'daily',
    isUnlocked: true,
    xpCurrent: 120,
    xpRequired: 120
  });

  let activeFilter = $state<EngagementCategory | 'all'>('all');
  let theme = $state<Theme>('cel-shaded');

  const games = MOCK_GAMES;

  const filteredGames = $derived(
    activeFilter === 'all'
      ? games
      : games.filter(g => g.engagementCategory === activeFilter)
  );

  const store: ArcadeState = {
    get gatingState() { return gatingState; },
    set gatingState(value) { gatingState = value; },

    get activeFilter() { return activeFilter; },
    set activeFilter(value) { activeFilter = value; },

    get theme() { return theme; },
    set theme(value) { theme = value; },

    get games() { return games; },
    get filteredGames() { return filteredGames; }
  };

  setContext(ARCADE_CONTEXT_KEY, store);
  return store;
}

export function getArcadeStore(): ArcadeState {
  const store = getContext<ArcadeState>(ARCADE_CONTEXT_KEY);
  if (!store) {
    throw new Error('Arcade store not found. Ensure createArcadeStore() is called in a parent component.');
  }
  return store;
}
