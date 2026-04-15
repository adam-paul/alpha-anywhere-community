import { getContext, setContext } from 'svelte';
import type {
  ChatState,
  ChatSendError,
  Conversation,
  Message,
  ChatParticipant,
  CreateChatStoreOptions,
  MessageLoadState
} from '$lib/types';

const CHAT_CONTEXT_KEY = 'chat';

export function createChatStore(options: CreateChatStoreOptions): ChatState {
  const currentUserId = options.currentUserId;
  const realtime = options.realtime;

  let conversations = $state<Conversation[]>(options.conversations);
  let messages = $state<Record<string, Message[]>>({});
  let friends = $state<ChatParticipant[]>(options.friends);
  let messageLoadStates = $state<Record<string, MessageLoadState>>({});

  // UI state
  let activeConversationId = $state<string | null>(null);
  let searchQuery = $state('');
  let composeText = $state('');
  let isDetailsPanelOpen = $state(false);
  let isNewChatModalOpen = $state(false);
  let sendError = $state<ChatSendError | null>(null);

  // Derived: total unread across all conversations. Drives the sidebar badge.
  const chatUnreadCount = $derived(conversations.reduce((sum, c) => sum + c.unreadCount, 0));

  // Listen for chat:unread signals on presence:global. The sender broadcasts
  // one per recipient per message; we only act on those targeted at us and
  // skip bumping if we're already viewing that conversation.
  //
  // The signal intentionally carries no message content — it rides on
  // presence:global, which every online user receives. To refresh the
  // sidebar preview for the target conversation, the recipient fetches
  // the latest message from the authenticated /api/chat/messages endpoint.
  realtime.onMessage((message) => {
    if (message.type !== 'chat:unread') return;
    const msg = message as { recipientId: string; conversationId: string };
    if (msg.recipientId !== currentUserId) return;
    const conv = conversations.find((c) => c.id === msg.conversationId);
    if (!conv) return;
    if (msg.conversationId === activeConversationId) {
      // Already viewing this conversation — the per-conversation chat:message
      // channel delivers the actual message, and selectConversation's server
      // mark-read keeps things tidy. Nothing to do here.
      return;
    }
    conv.unreadCount++;
    // Invalidate cached thread messages so the next selectConversation refetches
    // and shows the new message. Otherwise the user navigates back to /chat,
    // clicks the conversation, and sees stale content from before.
    delete messages[msg.conversationId];
    // Fetch the latest message to refresh the sidebar preview and timestamp.
    refreshConversationPreview(msg.conversationId);
  });

  /**
   * Refresh one conversation's `lastMessage` preview from the server and bump
   * the conversation to the top of the list. Called when a chat:unread signal
   * tells us a new message arrived for a conversation we're not currently
   * viewing (so handleIncomingMessage can't do it for us).
   */
  async function refreshConversationPreview(conversationId: string) {
    try {
      const res = await fetch(`/api/chat/messages?conversationId=${conversationId}&limit=1`);
      if (!res.ok) return;
      const data = (await res.json()) as {
        messages: Array<{ senderId: string; content: string; timestamp: string }>;
      };
      const last = data.messages?.[data.messages.length - 1];
      if (!last) return;
      const convIndex = conversations.findIndex((c) => c.id === conversationId);
      if (convIndex < 0) return;
      const conv = conversations[convIndex];
      conv.lastMessage = {
        content: last.content,
        senderId: last.senderId,
        timestamp: new Date(last.timestamp)
      };
      // Bump to top so the conversation list reflects recency.
      if (convIndex > 0) {
        conversations = [conv, ...conversations.filter((c) => c.id !== conversationId)];
      }
    } catch {
      // Silent fail — badge + unread still bumped, preview will update on
      // next refresh or when the user opens the conversation.
    }
  }

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

  const messageLoadState = $derived.by((): MessageLoadState => {
    if (!activeConversationId) return { status: 'idle' };
    return messageLoadStates[activeConversationId] ?? { status: 'idle' };
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

  /**
   * Clear the active conversation marker. Called when the chat page unmounts
   * so the chat:unread handler doesn't wrongly treat the previously-active
   * conversation as "still being viewed" from other routes.
   */
  function clearActive() {
    activeConversationId = null;
  }

  async function loadMessages(conversationId: string) {
    messageLoadStates[conversationId] = { status: 'loading' };
    try {
      const res = await fetch(`/api/chat/messages?conversationId=${conversationId}`);
      if (res.ok) {
        const data = await res.json();
        messages[conversationId] = data.messages.map(transformMessage);
        messageLoadStates[conversationId] = { status: 'loaded' };
      } else {
        messageLoadStates[conversationId] = { status: 'error', message: 'Failed to load messages' };
      }
    } catch {
      messageLoadStates[conversationId] = { status: 'error', message: 'Failed to load messages' };
    }
  }

  async function sendMessage(text: string) {
    if (!activeConversationId || !text.trim()) return;

    const convId = activeConversationId;
    const trimmed = text.trim();

    // Optimistic append as a PENDING bubble. Sidebar preview is NOT updated
    // here — the message hasn't been confirmed yet. This prevents flagged
    // content from appearing in the sidebar preview.
    const tempId = `temp-${Date.now()}`;
    const optimistic: Message = {
      id: tempId,
      conversationId: convId,
      senderId: currentUserId,
      content: trimmed,
      timestamp: new Date(),
      status: 'pending'
    };

    if (!messages[convId]) messages[convId] = [];
    messages[convId] = [...messages[convId], optimistic];

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
        const confirmed = { ...transformMessage(serverMsg), status: 'sent' as const };
        // Replace the pending bubble with the confirmed server message.
        messages[convId] = messages[convId].map((m) => (m.id === tempId ? confirmed : m));
        // Only NOW update the sidebar preview — using the server's confirmed content/timestamp.
        const conv = conversations.find((c) => c.id === convId);
        if (conv) {
          conv.lastMessage = {
            content: confirmed.content,
            senderId: confirmed.senderId,
            timestamp: confirmed.timestamp
          };
          // Broadcast chat:unread on presence:global for each other participant.
          // Carries conversationId so recipients can decide whether to bump
          // their unread count (they skip if they're already viewing the conv).
          for (const p of conv.participants) {
            if (p.id === currentUserId) continue;
            realtime.send({
              type: 'chat:unread',
              recipientId: p.id,
              conversationId: convId
            });
          }
        }
        // Broadcast via per-conversation WebSocket for real-time message relay.
        realtimeSend?.({
          type: 'chat:message',
          messageId: serverMsg.id,
          conversationId: convId,
          content: trimmed
        });
      } else {
        // Remove failed message
        messages[convId] = messages[convId].filter((m) => m.id !== tempId);
        // Surface a moderation rejection so the user sees why the send failed.
        // Non-moderation failures keep the existing silent-drop behavior.
        const body = await res.json().catch(() => null);
        if (body?.error === 'moderation_rejected' && typeof body.message === 'string') {
          sendError = { category: String(body.category ?? 'harmful'), message: body.message };
          // Restore the user's text so they can edit it rather than retype.
          composeText = trimmed;
        } else if (body?.error === 'moderation_unavailable') {
          sendError = { category: 'unavailable', message: body.message };
          composeText = trimmed;
        }
      }
    } catch {
      messages[convId] = messages[convId].filter((m) => m.id !== tempId);
    }
  }

  function handleIncomingMessage(msg: Message) {
    const convId = msg.conversationId;
    if (!messages[convId]) messages[convId] = [];
    messages[convId] = [...messages[convId], msg];

    // Update conversation's last message and bump to top. handleIncomingMessage
    // is only ever called from the per-conversation channel, which is only
    // subscribed for the active conversation — so the user is, by definition,
    // viewing this message live. Keep server last_read_at in sync so a future
    // page load doesn't show a stale unread count. Cross-conversation unread
    // bumps flow through the chat:unread signal on presence:global (see above).
    const convIndex = conversations.findIndex((c) => c.id === convId);
    if (convIndex >= 0) {
      const conv = conversations[convIndex];
      conv.lastMessage = {
        content: msg.content,
        senderId: msg.senderId,
        timestamp: msg.timestamp
      };
      if (convIndex > 0) {
        conversations = [conv, ...conversations.filter((c) => c.id !== convId)];
      }
      fetch(`/api/chat/conversations/${convId}/read`, { method: 'POST' }).catch(() => {});
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
    get chatUnreadCount() {
      return chatUnreadCount;
    },
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
    get messageLoadState() {
      return messageLoadState;
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
      // Any keystroke clears a pending moderation error — if the user
      // is editing, they haven't retried the rejected content yet.
      if (sendError !== null) sendError = null;
    },
    get sendError() {
      return sendError;
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
    clearActive,
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
