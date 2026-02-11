import { getContext, setContext } from 'svelte';
import type { ExploreState, Interest, Student, ViewMode } from '$lib/types';

const EXPLORE_CONTEXT_KEY = 'explore';

export function createExploreStore(initialStudents: Student[]) {
  let searchQuery = $state('');
  let activeInterestFilter = $state<Interest | 'all'>('all');
  let viewMode = $state<ViewMode>('grid');

  const students = initialStudents;

  const filteredStudents = $derived.by(() => {
    let result = students;

    // Filter by interest
    if (activeInterestFilter !== 'all') {
      const interest = activeInterestFilter;
      result = result.filter((s) => s.interests.includes(interest));
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (s) =>
          s.displayName.toLowerCase().includes(query) ||
          s.location.toLowerCase().includes(query) ||
          s.bio.toLowerCase().includes(query) ||
          s.interests.some((i) => i.toLowerCase().includes(query))
      );
    }

    return result;
  });

  const store: ExploreState = {
    get searchQuery() {
      return searchQuery;
    },
    set searchQuery(value) {
      searchQuery = value;
    },

    get activeInterestFilter() {
      return activeInterestFilter;
    },
    set activeInterestFilter(value) {
      activeInterestFilter = value;
    },

    get viewMode() {
      return viewMode;
    },
    set viewMode(value) {
      viewMode = value;
    },

    get students() {
      return students;
    },
    get filteredStudents() {
      return filteredStudents;
    }
  };

  setContext(EXPLORE_CONTEXT_KEY, store);
  return store;
}

export function getExploreStore(): ExploreState {
  const store = getContext<ExploreState>(EXPLORE_CONTEXT_KEY);
  if (!store) {
    throw new Error(
      'Explore store not found. Ensure createExploreStore() is called in a parent component.'
    );
  }
  return store;
}
