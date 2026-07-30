import { create } from 'zustand';
import { Conversation, Message, User } from '@/types';
import { messagesApi } from '@/lib/api';

interface ChatState {
  conversations: Conversation[];
  activePeer: User | null;
  messages: Message[];
  typingUsers: Set<string>;
  onlineUsers: Set<string>;
  hasMore: boolean;
  nextCursor: string | null;
  isLoadingMessages: boolean;
  replyTo: Message | null;
  searchQuery: string;

  setConversations: (conversations: Conversation[]) => void;
  setActivePeer: (peer: User | null) => void;
  setMessages: (messages: Message[]) => void;
  prependMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  removeMessage: (messageId: string) => void;
  setTyping: (userId: string, isTyping: boolean) => void;
  setOnlineUsers: (ids: string[]) => void;
  setUserOnline: (userId: string, online: boolean) => void;
  setReplyTo: (message: Message | null) => void;
  setSearchQuery: (q: string) => void;
  fetchConversations: () => Promise<void>;
  fetchMessages: (userId: string, reset?: boolean) => Promise<void>;
  updateUnread: (peerId: string, count: number) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activePeer: null,
  messages: [],
  typingUsers: new Set(),
  onlineUsers: new Set(),
  hasMore: false,
  nextCursor: null,
  isLoadingMessages: false,
  replyTo: null,
  searchQuery: '',

  setConversations: (conversations) => set({ conversations }),
  setActivePeer: (peer) => set({ activePeer: peer, messages: [], nextCursor: null }),
  setMessages: (messages) => set({ messages }),
  prependMessages: (messages) =>
    set((s) => {
      const existingIds = new Set(s.messages.map((m) => m.id));
      const deduped = messages.filter((m) => !existingIds.has(m.id));
      return { messages: [...deduped, ...s.messages] };
    }),
  addMessage: (message) =>
    set((s) => {
      if (s.messages.some((m) => m.id === message.id)) return s;
      const conversations = s.conversations.map((c) => {
        const peerId = message.senderId === c.peer.id || message.receiverId === c.peer.id
          ? c.peer.id
          : null;
        if (!peerId) return c;
        const isActive = s.activePeer?.id === peerId;
        return {
          ...c,
          lastMessage: message,
          unreadCount:
            isActive || message.senderId !== peerId
              ? c.unreadCount
              : c.unreadCount + 1,
        };
      });
      return { messages: [...s.messages, message], conversations };
    }),
  updateMessage: (messageId, updates) =>
    set((s) => ({
      messages: s.messages.map((m) => (m.id === messageId ? { ...m, ...updates } : m)),
    })),
  removeMessage: (messageId) =>
    set((s) => ({
      messages: s.messages.filter((m) => m.id !== messageId),
    })),
  setTyping: (userId, isTyping) =>
    set((s) => {
      const next = new Set(s.typingUsers);
      if (isTyping) next.add(userId);
      else next.delete(userId);
      return { typingUsers: next };
    }),
  setOnlineUsers: (ids) => set({ onlineUsers: new Set(ids) }),
  setUserOnline: (userId, online) =>
    set((s) => {
      const next = new Set(s.onlineUsers);
      if (online) next.add(userId);
      else next.delete(userId);
      return { onlineUsers: next };
    }),
  setReplyTo: (message) => set({ replyTo: message }),
  setSearchQuery: (q) => set({ searchQuery: q }),

  fetchConversations: async () => {
    const res = await messagesApi.conversations();
    set({ conversations: res.data.data.conversations });
  },

  fetchMessages: async (userId, reset = false) => {
    const { nextCursor, isLoadingMessages } = get();
    if (isLoadingMessages) return;
    set({ isLoadingMessages: true });
    try {
      const res = await messagesApi.get(userId, reset ? undefined : nextCursor || undefined);
      const { messages, nextCursor: cursor, hasMore } = res.data.data;
      if (reset) {
        set({ messages, nextCursor: cursor, hasMore, isLoadingMessages: false });
      } else {
        get().prependMessages(messages);
        set({ nextCursor: cursor, hasMore, isLoadingMessages: false });
      }
    } catch {
      set({ isLoadingMessages: false });
    }
  },

  updateUnread: (peerId, count) =>
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.peer.id === peerId ? { ...c, unreadCount: count } : c
      ),
    })),
}));
