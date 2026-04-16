<script lang="ts">
  import { Button } from '$lib/components/ui';
  import { LINKABLE_PLATFORMS } from '$lib/constants';
  import type { LinkablePlatform, LinkedAccountsData } from '$lib/types';

  interface Props {
    isOwnProfile: boolean;
    linkedAccounts: LinkedAccountsData;
    onlink?: (platform: LinkablePlatform) => void;
    onunlink?: (platform: LinkablePlatform) => void;
  }

  let { isOwnProfile, linkedAccounts, onlink, onunlink }: Props = $props();

  function getLinked(platform: LinkablePlatform) {
    if (platform === 'roblox') return linkedAccounts.roblox;
    return null;
  }

  // Own profile sees every platform (active, "Not linked", and "Coming soon").
  // Other profiles only show platforms the user has actually linked — no point
  // advertising placeholders or empty slots to viewers.
  const visiblePlatforms = $derived(
    isOwnProfile ? LINKABLE_PLATFORMS : LINKABLE_PLATFORMS.filter((p) => getLinked(p.id))
  );
</script>

<div class="linked-accounts">
  {#each visiblePlatforms as platform (platform.id)}
    {@const linked = getLinked(platform.id)}
    <div class="account-row" class:unavailable={!platform.available}>
      <div class="account-identity">
        {#if linked?.avatarUrl}
          <img class="account-avatar" src={linked.avatarUrl} alt={linked.username} />
        {:else}
          <div class="account-avatar placeholder" aria-hidden="true"></div>
        {/if}
        <div class="account-info">
          <span class="account-label">{platform.label}</span>
          {#if linked}
            <span class="account-username">@{linked.username}</span>
          {:else if !platform.available}
            <span class="account-status">Coming soon</span>
          {:else if isOwnProfile}
            <span class="account-status">Not linked</span>
          {/if}
        </div>
      </div>

      {#if isOwnProfile}
        {#if linked}
          <Button variant="danger" size="sm" onclick={() => onunlink?.(platform.id)}>Unlink</Button>
        {:else if platform.available}
          <Button variant="primary" size="sm" onclick={() => onlink?.(platform.id)}>Link</Button>
        {:else}
          <Button variant="secondary" size="sm" disabled>Link</Button>
        {/if}
      {/if}
    </div>
  {/each}
</div>

<style>
  .linked-accounts {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .account-row {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .account-row.unavailable .account-identity {
    opacity: 0.5;
  }

  .account-identity {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    flex: 1;
    min-width: 0;
  }

  .account-avatar {
    width: var(--avatar-size-sm);
    height: var(--avatar-size-sm);
    border-radius: var(--radius-zero);
    border: var(--border-width) solid var(--color-border);
    flex-shrink: 0;
  }

  .account-avatar.placeholder {
    background: var(--color-bg);
  }

  .account-info {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    min-width: 0;
  }

  .account-label {
    font-size: var(--font-size-xs);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-muted);
  }

  .account-username {
    font-size: var(--font-size-sm);
    font-weight: 600;
  }

  .account-status {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    font-style: italic;
  }
</style>
