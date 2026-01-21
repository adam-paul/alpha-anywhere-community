import { getContext, setContext } from 'svelte';
import type { Conversation, Message, Student } from '../types';
import { MOCK_CONVERSATIONS, MOCK_MESSAGES, MOCK_STUDENTS } from '../mock-data';

const CHAT_CONTEXT_KEY = 'chat';

export interface ChatState {
  // Data
  conversations: Conversation[];
  messages: Record<string, Message[]>;

  // UI State
  activeConversationId: string | null;
  searchQuery: string;
  composeText: string;
  isDetailsPanelOpen: boolean;
  isNewChatModalOpen: boolean;

  // Derived
  readonly filteredConversations: Conversation[];
  readonly activeConversation: Conversation | null;
  readonly activeMessages: Message[];
  readonly activeParticipants: Student[];

  // Actions
  selectConversation(id: string): void;
  sendMessage(text: string): void;
  toggleDetailsPanel(): void;
  openNewChatModal(): void;
  closeNewChatModal(): void;
  createConversation(participantIds: string[]): string;
}

export function createChatStore(): ChatState {
  // Make copies so we can mutate
  let conversations = $state<Conversation[]>([...MOCK_CONVERSATIONS]);
  let messages = $state<Record<string, Message[]>>(
    Object.fromEntries(
      Object.entries(MOCK_MESSAGES).map(([k, v]) => [k, [...v]])
    )
  );

  // UI State
  let activeConversationId = $state<string | null>(MOCK_CONVERSATIONS[0]?.id ?? null);
  let searchQuery = $state('');
  let composeText = $state('');
  let isDetailsPanelOpen = $state(false);
  let isNewChatModalOpen = $state(false);

  // Derived state
  const filteredConversations = $derived.by(() => {
    if (!searchQuery.trim()) {
      return conversations;
    }

    const query = searchQuery.toLowerCase().trim();
    return conversations.filter(conv => {
      // Search by conversation name
      if (conv.name?.toLowerCase().includes(query)) {
        return true;
      }

      // Search by participant names
      const participants = conv.participantIds
        .map(id => MOCK_STUDENTS.find(s => s.id === id))
        .filter((s): s is Student => s !== undefined);

      return participants.some(p =>
        p.displayName.toLowerCase().includes(query)
      );
    });
  });

  const activeConversation = $derived(
    conversations.find(c => c.id === activeConversationId) ?? null
  );

  const activeMessages = $derived.by(() => {
    if (!activeConversationId) return [];
    return messages[activeConversationId] ?? [];
  });

  const activeParticipants = $derived.by(() => {
    const conv = conversations.find(c => c.id === activeConversationId);
    if (!conv) return [];

    return conv.participantIds
      .map(id => MOCK_STUDENTS.find(s => s.id === id))
      .filter((s): s is Student => s !== undefined);
  });

  // Actions
  function selectConversation(id: string) {
    activeConversationId = id;
    composeText = '';

    // Mark as read
    const conv = conversations.find(c => c.id === id);
    if (conv && conv.unreadCount > 0) {
      conv.unreadCount = 0;
    }
  }

  function sendMessage(text: string) {
    if (!activeConversationId || !text.trim()) return;

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      conversationId: activeConversationId,
      senderId: 'me',
      content: text.trim(),
      timestamp: new Date()
    };

    // Add message to conversation
    if (!messages[activeConversationId]) {
      messages[activeConversationId] = [];
    }
    messages[activeConversationId] = [...messages[activeConversationId], newMessage];

    // Update last message on conversation
    const conv = conversations.find(c => c.id === activeConversationId);
    if (conv) {
      conv.lastMessage = {
        content: text.trim(),
        senderId: 'me',
        timestamp: new Date()
      };
    }

    // Clear compose
    composeText = '';
  }

  function toggleDetailsPanel() {
    isDetailsPanelOpen = !isDetailsPanelOpen;
  }

  function openNewChatModal() {
    isNewChatModalOpen = true;
  }

  function closeNewChatModal() {
    isNewChatModalOpen = false;
  }

  function createConversation(participantIds: string[]): string {
    // Check if conversation already exists with same participants
    const existing = conversations.find(c => {
      if (c.participantIds.length !== participantIds.length) return false;
      return participantIds.every(id => c.participantIds.includes(id));
    });

    if (existing) {
      activeConversationId = existing.id;
      isNewChatModalOpen = false;
      return existing.id;
    }

    // Create new conversation
    const newConv: Conversation = {
      id: `conv-${Date.now()}`,
      participantIds,
      unreadCount: 0,
      isMuted: false
    };

    conversations = [newConv, ...conversations];
    messages[newConv.id] = [];
    activeConversationId = newConv.id;
    isNewChatModalOpen = false;

    return newConv.id;
  }

  const store: ChatState = {
    get conversations() { return conversations; },
    set conversations(value) { conversations = value; },

    get messages() { return messages; },
    set messages(value) { messages = value; },

    get activeConversationId() { return activeConversationId; },
    set activeConversationId(value) { activeConversationId = value; },

    get searchQuery() { return searchQuery; },
    set searchQuery(value) { searchQuery = value; },

    get composeText() { return composeText; },
    set composeText(value) { composeText = value; },

    get isDetailsPanelOpen() { return isDetailsPanelOpen; },
    set isDetailsPanelOpen(value) { isDetailsPanelOpen = value; },

    get isNewChatModalOpen() { return isNewChatModalOpen; },
    set isNewChatModalOpen(value) { isNewChatModalOpen = value; },

    get filteredConversations() { return filteredConversations; },
    get activeConversation() { return activeConversation; },
    get activeMessages() { return activeMessages; },
    get activeParticipants() { return activeParticipants; },

    selectConversation,
    sendMessage,
    toggleDetailsPanel,
    openNewChatModal,
    closeNewChatModal,
    createConversation
  };

  setContext(CHAT_CONTEXT_KEY, store);
  return store;
}

export function getChatStore(): ChatState {
  const store = getContext<ChatState>(CHAT_CONTEXT_KEY);
  if (!store) {
    throw new Error('Chat store not found. Ensure createChatStore() is called in a parent component.');
  }
  return store;
}
