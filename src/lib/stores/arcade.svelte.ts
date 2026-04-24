import { getContext, setContext } from 'svelte';
import type { ArcadeState, CreateArcadeStoreOptions, EngagementFilter } from '$lib/types';

const ARCADE_CONTEXT_KEY = 'arcade';

export function createArcadeStore(options: CreateArcadeStoreOptions = {}) {
  let activeFilter = $state<EngagementFilter>('all');
  let games = $state(options.games ?? []);
  let robloxLinked = $state(options.robloxLinked ?? false);

  const filteredGames = $derived(
    activeFilter === 'all' ? games : games.filter((g) => g.engagementCategory === activeFilter)
  );

  const store: ArcadeState = {
    get activeFilter() {
      return activeFilter;
    },
    set activeFilter(value) {
      activeFilter = value;
    },

    get games() {
      return games;
    },
    get filteredGames() {
      return filteredGames;
    },
    get robloxLinked() {
      return robloxLinked;
    },

    setGames(newGames) {
      games = newGames;
    },
    setRobloxLinked(linked) {
      robloxLinked = linked;
    }
  };

  setContext(ARCADE_CONTEXT_KEY, store);
  return store;
}

export function getArcadeStore(): ArcadeState {
  const store = getContext<ArcadeState>(ARCADE_CONTEXT_KEY);
  if (!store) {
    throw new Error(
      'Arcade store not found. Ensure createArcadeStore() is called in a parent component.'
    );
  }
  return store;
}
