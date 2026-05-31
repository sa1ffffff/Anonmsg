import { create } from 'zustand';

export interface Message {
  id: string;
  content: string;
  alias: string;
  sent_at: string;
  reactions?: Record<string, number>;
}

interface ChatStore {
  messages: Record<string, Message[]>;
  typingAliases: Record<string, string[]>;
  addMessage: (groupId: string, message: Message) => void;
  setMessages: (groupId: string, messages: Message[]) => void;
  prependMessages: (groupId: string, messages: Message[]) => void;
  setTyping: (groupId: string, alias: string, isTyping: boolean) => void;
  updateReaction: (groupId: string, messageId: string, emoji: string, count: number) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: {},
  typingAliases: {},
  addMessage: (groupId, message) =>
    set((state) => {
      const current = state.messages[groupId] ?? [];
      if (current.find((m) => m.id === message.id)) {
        return state;
      }
      return {
        messages: {
          ...state.messages,
          [groupId]: [...current, message],
        },
      };
    }),
  setMessages: (groupId, messages) =>
    set((state) => ({
      messages: { ...state.messages, [groupId]: messages },
    })),
  prependMessages: (groupId, messages) =>
    set((state) => {
      const current = state.messages[groupId] ?? [];
      const existingIds = new Set(current.map((m) => m.id));
      const filtered = messages.filter((m) => !existingIds.has(m.id));
      return {
        messages: {
          ...state.messages,
          [groupId]: [...filtered, ...current],
        },
      };
    }),
  setTyping: (groupId, alias, isTyping) =>
    set((state) => {
      const current = state.typingAliases[groupId] ?? [];
      return {
        typingAliases: {
          ...state.typingAliases,
          [groupId]: isTyping
            ? [...new Set([...current, alias])]
            : current.filter((a) => a !== alias),
        },
      };
    }),
  updateReaction: (groupId, messageId, emoji, count) =>
    set((state) => {
      const current = state.messages[groupId] ?? [];
      return {
        messages: {
          ...state.messages,
          [groupId]: current.map((message) => {
            if (message.id !== messageId) return message;
            const reactions = { ...(message.reactions ?? {}) };
            reactions[emoji] = count;
            return { ...message, reactions };
          }),
        },
      };
    }),
}));
