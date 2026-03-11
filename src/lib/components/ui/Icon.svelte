<script lang="ts">
  import type { IconName } from '$lib/types';

  interface Props {
    name: IconName;
    size?: number;
  }

  let { name, size = 24 }: Props = $props();

  // Icon paths (using Lucide icon style - simple, consistent)
  const icons: Record<IconName, string> = {
    search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
    chat: 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z',
    gamepad:
      'M6 12h4m-2-2v4m6.5-.5h.01m2 0h.01M6 18h12a2 2 0 002-2V8a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2z',
    user: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2m8-10a4 4 0 100-8 4 4 0 000 8z',
    users:
      'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2m22-4v2m0 0a4 4 0 01-4 4m4-6a4 4 0 00-4-4m-4-4a4 4 0 11-8 0 4 4 0 018 0z',
    bell: 'M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9m-4.27 13a2 2 0 01-3.46 0',
    lock: 'M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zm-3 0V7a4 4 0 10-8 0v4',
    unlock:
      'M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zm-3 0V7a4 4 0 00-7.9-1',
    map: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7',
    'chevron-right': 'M9 5l7 7-7 7',
    x: 'M18 6L6 18M6 6l12 12',
    edit: 'M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7m-1.5-9.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z',
    plus: 'M12 5v14m-7-7h14',
    send: 'M22 2L11 13m11-11l-7 20-4-9-9-4 20-7z',
    info: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm0-14v.01M12 16v-4',
    more: 'M12 13a1 1 0 100-2 1 1 0 000 2zm7 0a1 1 0 100-2 1 1 0 000 2zM5 13a1 1 0 100-2 1 1 0 000 2z',
    check: 'M20 6L9 17l-5-5'
  };
</script>

<svg
  class="icon"
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  <path d={icons[name]} />
</svg>

<style>
  .icon {
    display: inline-block;
    vertical-align: middle;
    flex-shrink: 0;
  }
</style>
