import { getContext, setContext } from 'svelte';
import type { WidgetConfig, EngagementCategory, Game } from '../types';

const WIDGET_CONTEXT_KEY = 'arcade-widget';

export interface WidgetState {
  getConfig: () => WidgetConfig;
  activeFilter: EngagementCategory | 'all';
  getFilteredGames: () => Game[];
}

export function createWidgetContext(getConfig: () => WidgetConfig) {
  let activeFilter = $state<EngagementCategory | 'all'>('all');

  function getFilteredGames(): Game[] {
    const config = getConfig();
    if (activeFilter === 'all') {
      return config.games;
    }
    return config.games.filter(g => g.engagementCategory === activeFilter);
  }

  const state: WidgetState = {
    getConfig,
    get activeFilter() { return activeFilter; },
    set activeFilter(value) { activeFilter = value; },
    getFilteredGames
  };

  setContext(WIDGET_CONTEXT_KEY, state);
  return state;
}

export function getWidgetContext(): WidgetState {
  const context = getContext<WidgetState>(WIDGET_CONTEXT_KEY);
  if (!context) {
    throw new Error('Widget context not found. Make sure ArcadeWidget is a parent component.');
  }
  return context;
}
