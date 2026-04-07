import { getContext, setContext } from 'svelte';
import type {
  ArcadeState,
  CreateArcadeStoreOptions,
  EngagementFilter,
  PresenceCounts,
  Theme
} from '$lib/types';

const ARCADE_CONTEXT_KEY = 'arcade';

export function createArcadeStore(options: CreateArcadeStoreOptions = {}) {
  let activeFilter = $state<EngagementFilter>('all');
  let theme = $state<Theme>('cel-shaded');
  let games = $state(options.games ?? []);
  let presenceCounts = $state<PresenceCounts>({});
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

    get theme() {
      return theme;
    },
    set theme(value) {
      theme = value;
    },

    get games() {
      return games;
    },
    get filteredGames() {
      return filteredGames;
    },
    get presenceCounts() {
      return presenceCounts;
    },
    get robloxLinked() {
      return robloxLinked;
    },

    setGames(newGames) {
      games = newGames;
    },
    setPresenceCounts(counts) {
      presenceCounts = counts;
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
