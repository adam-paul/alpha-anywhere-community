<script lang="ts">
  import { Button, Input, Modal } from '$lib/components/ui';
  import type { RobloxLinkStatus, RobloxUserLookupResult } from '$lib/types';

  interface Props {
    open: boolean;
    onclose: () => void;
    onlinked: () => void;
  }

  let { open, onclose, onlinked }: Props = $props();

  let username = $state('');
  let status = $state<RobloxLinkStatus>('idle');
  let errorMessage = $state('');
  let lookupResult = $state<RobloxUserLookupResult | null>(null);

  function inputValue(e: Event): string {
    return (e.target as HTMLInputElement).value;
  }

  // Reset when modal opens
  $effect(() => {
    if (open) {
      username = '';
      status = 'idle';
      errorMessage = '';
      lookupResult = null;
    }
  });

  async function handleLookup() {
    if (!username.trim()) return;
    status = 'looking-up';
    errorMessage = '';

    try {
      const res = await fetch('/api/arcade/roblox/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Lookup failed');
      }

      const { result } = (await res.json()) as { result: RobloxUserLookupResult };
      lookupResult = result;
      status = 'confirming';
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : 'Lookup failed';
      status = 'error';
    }
  }

  async function handleConfirm() {
    if (!lookupResult) return;
    status = 'linking';
    errorMessage = '';

    try {
      const res = await fetch('/api/arcade/roblox/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          robloxUserId: lookupResult.robloxUserId,
          robloxUsername: lookupResult.robloxUsername,
          robloxAvatarUrl: lookupResult.robloxAvatarUrl
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Linking failed');
      }

      onlinked();
      onclose();
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : 'Linking failed';
      status = 'error';
    }
  }

  function handleReset() {
    username = '';
    status = 'idle';
    errorMessage = '';
    lookupResult = null;
  }
</script>

<Modal {open} {onclose} title="Link Roblox Account" size="sm">
  {#snippet content()}
    <div class="link-form">
      {#if status === 'idle' || status === 'looking-up'}
        <p class="description">
          Link your Roblox account to track your arcade presence and show friends when you're
          in-game.
        </p>
        <fieldset class="field-group">
          <label class="field-label" for="roblox-username">Roblox Username</label>
          <div class="lookup-row">
            <Input
              id="roblox-username"
              value={username}
              placeholder="Enter your Roblox username"
              oninput={(e) => (username = inputValue(e))}
              disabled={status === 'looking-up'}
            />
            <Button
              variant="primary"
              onclick={handleLookup}
              disabled={!username.trim() || status === 'looking-up'}
            >
              {status === 'looking-up' ? 'Looking up...' : 'Look up'}
            </Button>
          </div>
        </fieldset>
        <p class="no-account">
          Don't have a Roblox account?
          <a href="https://www.roblox.com/CreateAccount" target="_blank" rel="noopener noreferrer">
            Create one
          </a>
        </p>
      {:else if status === 'confirming' && lookupResult}
        <p class="description">Is this your Roblox account?</p>
        <div class="roblox-identity">
          {#if lookupResult.robloxAvatarUrl}
            <img
              class="roblox-avatar"
              src={lookupResult.robloxAvatarUrl}
              alt={lookupResult.robloxDisplayName}
            />
          {/if}
          <div class="roblox-info">
            <span class="roblox-display-name">{lookupResult.robloxDisplayName}</span>
            <span class="roblox-username">@{lookupResult.robloxUsername}</span>
          </div>
        </div>
        <p class="linking-note">
          You'll still need to log into this Roblox account when launching games.
        </p>
      {:else if status === 'linking'}
        <p class="description">Linking your account...</p>
      {:else if status === 'error'}
        <div class="error-banner">{errorMessage}</div>
      {/if}
    </div>
  {/snippet}

  {#snippet footer()}
    {#if status === 'confirming'}
      <Button variant="secondary" onclick={handleReset}>Cancel</Button>
      <Button variant="primary" onclick={handleConfirm}>This is me</Button>
    {:else if status === 'error'}
      <Button variant="secondary" onclick={handleReset}>Try again</Button>
    {:else}
      <Button variant="secondary" onclick={onclose} disabled={status === 'looking-up'}>
        Cancel
      </Button>
    {/if}
  {/snippet}
</Modal>

<style>
  .link-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .description {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    margin: 0;
  }

  .field-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    border: none;
    padding: 0;
    margin: 0;
  }

  .field-label {
    font-size: var(--font-size-sm);
    font-weight: 600;
  }

  .lookup-row {
    display: flex;
    gap: var(--space-3);
    align-items: stretch;
  }

  .lookup-row :global(.input) {
    flex: 1;
  }

  .lookup-row :global(.btn) {
    white-space: nowrap;
  }

  .roblox-identity {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-4);
    background: var(--color-bg);
    border: var(--border-width) solid var(--color-border);
    border-radius: var(--radius-zero);
  }

  .roblox-avatar {
    width: 64px;
    height: 64px;
    border-radius: var(--radius-zero);
    border: var(--border-width) solid var(--color-border);
  }

  .roblox-info {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .roblox-display-name {
    font-size: var(--font-size-base);
    font-weight: 700;
  }

  .roblox-username {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }

  .linking-note {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    margin: 0;
    font-style: italic;
  }

  .no-account {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    margin: 0;
  }

  .no-account a {
    color: var(--color-primary);
    font-weight: 600;
    text-decoration: none;
  }

  .no-account a:hover {
    text-decoration: underline;
  }

  .error-banner {
    padding: var(--space-3);
    background: var(--color-error);
    color: white;
    font-size: var(--font-size-sm);
    font-weight: 600;
    border-radius: var(--radius-zero);
  }
</style>
