<script lang="ts">
  import { getChatStore } from '$lib/stores/chat.svelte';
  import { Avatar, Icon, Button } from '$lib/components/ui';
  import SearchBar from '$lib/components/SearchBar.svelte';
  import { MOCK_STUDENTS } from '$lib/mock-data';
  import type { Student } from '$lib/types';

  const chat = getChatStore();

  let searchQuery = $state('');
  let selectedIds = $state<string[]>([]);

  // Filter students by search
  const filteredStudents = $derived.by(() => {
    if (!searchQuery.trim()) return MOCK_STUDENTS;

    const query = searchQuery.toLowerCase().trim();
    return MOCK_STUDENTS.filter(s =>
      s.displayName.toLowerCase().includes(query) ||
      s.handle.toLowerCase().includes(query)
    );
  });

  function toggleStudent(id: string) {
    if (selectedIds.includes(id)) {
      selectedIds = selectedIds.filter(i => i !== id);
    } else {
      selectedIds = [...selectedIds, id];
    }
  }

  function handleCreate() {
    if (selectedIds.length === 0) return;
    chat.createConversation(selectedIds);
    // Reset
    searchQuery = '';
    selectedIds = [];
  }

  function handleClose() {
    chat.closeNewChatModal();
    searchQuery = '';
    selectedIds = [];
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  }
</script>

{#if chat.isNewChatModalOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="modal-backdrop" role="presentation" onclick={handleBackdropClick}>
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <header class="modal-header">
        <h2 id="modal-title" class="modal-title">New Chat</h2>
        <button class="close-btn" onclick={handleClose} aria-label="Close">
          <Icon name="x" size={20} />
        </button>
      </header>

      <div class="modal-content">
        <div class="search-container">
          <SearchBar
            bind:value={searchQuery}
            placeholder="Search students"
          />
        </div>

        {#if selectedIds.length > 0}
          <div class="selected-preview">
            <span class="selected-label">Selected:</span>
            <div class="selected-names">
              {#each selectedIds as id}
                {@const student = MOCK_STUDENTS.find(s => s.id === id)}
                {#if student}
                  <span class="selected-name">{student.displayName}</span>
                {/if}
              {/each}
            </div>
          </div>
        {/if}

        <div class="students-list">
          {#each filteredStudents as student (student.id)}
            <button
              class="student-item"
              class:selected={selectedIds.includes(student.id)}
              onclick={() => toggleStudent(student.id)}
            >
              <Avatar
                src={student.avatarUrl}
                alt={student.displayName}
                size="sm"
                fallback={student.displayName.charAt(0)}
              />
              <div class="student-info">
                <span class="student-name">{student.displayName}</span>
                <span class="student-handle">@{student.handle}</span>
              </div>
              {#if selectedIds.includes(student.id)}
                <div class="check-icon">
                  <Icon name="check" size={16} />
                </div>
              {/if}
            </button>
          {:else}
            <div class="empty-state">
              <p>No students found</p>
            </div>
          {/each}
        </div>
      </div>

      <footer class="modal-footer">
        <Button variant="secondary" onclick={handleClose}>Cancel</Button>
        <Button
          variant="primary"
          onclick={handleCreate}
          disabled={selectedIds.length === 0}
        >
          Create Chat
        </Button>
      </footer>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }

  .modal {
    width: 100%;
    max-width: 400px;
    max-height: 80vh;
    background: var(--color-surface);
    border: var(--border-width) solid var(--color-border);
    display: flex;
    flex-direction: column;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4);
    border-bottom: var(--border-width) solid var(--color-border);
  }

  .modal-title {
    font-size: var(--font-size-lg);
    font-weight: 700;
    margin: 0;
  }

  .close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-1);
    background: transparent;
    border: none;
    cursor: pointer;
    color: var(--color-text-muted);
    transition: color var(--transition-fast);
  }

  .close-btn:hover {
    color: var(--color-text);
  }

  .modal-content {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-4);
  }

  .search-container {
    margin-bottom: var(--space-4);
  }

  .search-container :global(.search-bar) {
    max-width: none;
  }

  .selected-preview {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3);
    background: var(--color-bg);
    border: var(--border-width) solid var(--color-border);
    margin-bottom: var(--space-4);
  }

  .selected-label {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    flex-shrink: 0;
  }

  .selected-names {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .selected-name {
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--color-primary);
  }

  .students-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .student-item {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3);
    width: 100%;
    text-align: left;
    background: transparent;
    border: var(--border-width) solid transparent;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .student-item:hover {
    background: var(--color-bg);
  }

  .student-item.selected {
    background: var(--color-bg);
    border-color: var(--color-primary);
  }

  .student-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .student-name {
    font-size: var(--font-size-sm);
    font-weight: 600;
  }

  .student-handle {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  .check-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    background: var(--color-primary);
    color: white;
    border-radius: 50%;
  }

  .empty-state {
    padding: var(--space-8);
    text-align: center;
    color: var(--color-text-muted);
  }

  .empty-state p {
    margin: 0;
    font-size: var(--font-size-sm);
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-3);
    padding: var(--space-4);
    border-top: var(--border-width) solid var(--color-border);
  }
</style>
