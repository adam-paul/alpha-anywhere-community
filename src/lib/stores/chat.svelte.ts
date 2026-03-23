import { getContext, setContext } from 'svelte';
import type {
  ChatState,
  Conversation,
  Message,
  ChatParticipant,
  CreateChatStoreOptions
} from '$lib/types';

const CHAT_CONTEXT_KEY = 'chat';

export function createChatStore(options: CreateChatStoreOptions): ChatState {
  const currentUserId = options.currentUserId;

  let conversations = $state<Conversation[]>(options.conversations);
  let messages = $state<Record<string, Message[]>>({});
  let friends = $state<ChatParticipant[]>(options.friends);
  let isLoadingMessages = $state(false);

  // UI state
  let activeConversationId = $state<string | null>(null);
  let searchQuery = $state('');
  let composeText = $state('');
  let isDetailsPanelOpen = $state(false);
  let isNewChatModalOpen = $state(false);

  // Realtime send function — set by the page when WebSocket connects
  let realtimeSend: ((msg: object) => void) | null = null;

  // Derived state
  const filteredConversations = $derived.by(() => {
    if (!searchQuery.trim()) return conversations;

    const query = searchQuery.toLowerCase().trim();
    return conversations.filter((conv) => {
      if (conv.name?.toLowerCase().includes(query)) return true;
      return conv.participants.some((p) => p.displayName.toLowerCase().includes(query));
    });
  });

  const activeConversation = $derived(
    conversations.find((c) => c.id === activeConversationId) ?? null
  );

  const activeMessages = $derived.by(() => {
    if (!activeConversationId) return [];
    return messages[activeConversationId] ?? [];
  });

  const activeParticipants = $derived.by(() => {
    return activeConversation?.participants ?? [];
  });

  // Actions
  function selectConversation(id: string) {
    activeConversationId = id;
    composeText = '';

    // Mark as read locally
    const conv = conversations.find((c) => c.id === id);
    if (conv && conv.unreadCount > 0) {
      conv.unreadCount = 0;
    }

    // Fire-and-forget mark as read on server
    fetch(`/api/chat/conversations/${id}/read`, { method: 'POST' }).catch(() => {});

    // Lazy-load messages if not already loaded
    if (!messages[id]) {
      loadMessages(id);
    }
  }

  async function loadMessages(conversationId: string) {
    isLoadingMessages = true;
    try {
      const res = await fetch(`/api/chat/messages?conversationId=${conversationId}`);
      if (res.ok) {
        const data = await res.json();
        messages[conversationId] = data.messages.map(transformMessage);
      }
    } finally {
      isLoadingMessages = false;
    }
  }

  async function sendMessage(text: string) {
    if (!activeConversationId || !text.trim()) return;

    const convId = activeConversationId;
    const trimmed = text.trim();

    // Optimistic append
    const tempId = `temp-${Date.now()}`;
    const optimistic: Message = {
      id: tempId,
      conversationId: convId,
      senderId: currentUserId,
      content: trimmed,
      timestamp: new Date()
    };

    if (!messages[convId]) messages[convId] = [];
    messages[convId] = [...messages[convId], optimistic];

    // Update last message preview
    const conv = conversations.find((c) => c.id === convId);
    if (conv) {
      conv.lastMessage = { content: trimmed, senderId: currentUserId, timestamp: new Date() };
    }

    composeText = '';

    // Persist to D1
    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: convId, content: trimmed })
      });

      if (res.ok) {
        const serverMsg = await res.json();
        // Replace temp message with server response
        messages[convId] = messages[convId].map((m) =>
          m.id === tempId ? transformMessage(serverMsg) : m
        );
        // Broadcast via WebSocket for real-time delivery
        realtimeSend?.({
          type: 'chat:message',
          messageId: serverMsg.id,
          conversationId: convId,
          content: trimmed
        });
      } else {
        // Remove failed message
        messages[convId] = messages[convId].filter((m) => m.id !== tempId);
      }
    } catch {
      messages[convId] = messages[convId].filter((m) => m.id !== tempId);
    }
  }

  function handleIncomingMessage(msg: Message) {
    const convId = msg.conversationId;
    if (!messages[convId]) messages[convId] = [];
    messages[convId] = [...messages[convId], msg];

    // Update conversation's last message and bump to top
    const convIndex = conversations.findIndex((c) => c.id === convId);
    if (convIndex >= 0) {
      const conv = conversations[convIndex];
      conv.lastMessage = {
        content: msg.content,
        senderId: msg.senderId,
        timestamp: msg.timestamp
      };
      // Bump conversation to top
      if (convIndex > 0) {
        conversations = [conv, ...conversations.filter((c) => c.id !== convId)];
      }
      // Increment unread if not the active conversation
      if (convId !== activeConversationId) {
        conv.unreadCount++;
      }
    }
  }

  function setRealtimeSend(fn: ((msg: object) => void) | null) {
    realtimeSend = fn;
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

  async function createConversation(participantIds: string[]): Promise<string> {
    try {
      const res = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantIds })
      });

      if (!res.ok) throw new Error('Failed to create conversation');

      const { conversation: raw } = await res.json();
      const conv: Conversation = {
        id: raw.id,
        name: raw.name ?? undefined,
        participants: raw.participants.map(
          (p: { userId: string; displayName: string; avatarUrl: string | null; handle: string }) =>
            ({
              id: p.userId,
              displayName: p.displayName,
              avatarUrl: p.avatarUrl,
              handle: p.handle
            }) as ChatParticipant
        ),
        lastMessage: raw.lastMessage
          ? {
              content: raw.lastMessage.content,
              senderId: raw.lastMessage.senderId,
              timestamp: new Date(raw.lastMessage.createdAt)
            }
          : undefined,
        unreadCount: raw.unreadCount ?? 0
      };

      // Check if already in list (existing 1:1 returned)
      if (!conversations.some((c) => c.id === conv.id)) {
        conversations = [conv, ...conversations];
      }

      messages[conv.id] = [];
      activeConversationId = conv.id;
      isNewChatModalOpen = false;

      return conv.id;
    } catch {
      throw new Error('Failed to create conversation');
    }
  }

  const store: ChatState = {
    get conversations() {
      return conversations;
    },
    get activeConversationId() {
      return activeConversationId;
    },
    get currentUserId() {
      return currentUserId;
    },
    get friends() {
      return friends;
    },
    get isLoadingMessages() {
      return isLoadingMessages;
    },

    get searchQuery() {
      return searchQuery;
    },
    set searchQuery(value) {
      searchQuery = value;
    },
    get composeText() {
      return composeText;
    },
    set composeText(value) {
      composeText = value;
    },
    get isDetailsPanelOpen() {
      return isDetailsPanelOpen;
    },
    set isDetailsPanelOpen(value) {
      isDetailsPanelOpen = value;
    },
    get isNewChatModalOpen() {
      return isNewChatModalOpen;
    },
    set isNewChatModalOpen(value) {
      isNewChatModalOpen = value;
    },

    get filteredConversations() {
      return filteredConversations;
    },
    get activeConversation() {
      return activeConversation;
    },
    get activeMessages() {
      return activeMessages;
    },
    get activeParticipants() {
      return activeParticipants;
    },

    selectConversation,
    sendMessage,
    toggleDetailsPanel,
    openNewChatModal,
    closeNewChatModal,
    createConversation,
    handleIncomingMessage,
    setRealtimeSend
  };

  setContext(CHAT_CONTEXT_KEY, store);
  return store;
}

export function getChatStore(): ChatState {
  const store = getContext<ChatState>(CHAT_CONTEXT_KEY);
  if (!store) {
    throw new Error(
      'Chat store not found. Ensure createChatStore() is called in a parent component.'
    );
  }
  return store;
}

function transformMessage(raw: {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  imageUrl?: string | null;
  timestamp: string;
}): Message {
  return {
    id: raw.id,
    conversationId: raw.conversationId,
    senderId: raw.senderId,
    content: raw.content,
    imageUrl: raw.imageUrl ?? undefined,
    timestamp: new Date(raw.timestamp)
  };
}
