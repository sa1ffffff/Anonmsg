import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { apiFetch } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { Message, useChatStore } from '../../store/chatStore';
import { useSocket } from '../../hooks/useSocket';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import ScrollToBottom from './ScrollToBottom';

interface ChatWindowProps {
  groupId: string;
}

interface MessageResponse extends Message {
  reactions?: Record<string, number>;
}

export default function ChatWindow({ groupId }: ChatWindowProps) {
  const token = useAuthStore((s) => s.token);
  const { messages, typingAliases, setMessages, prependMessages } = useChatStore();
  const { sendMessage, sendTyping, sendReaction } = useSocket(groupId);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [newCount, setNewCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const restoreScrollRef = useRef<{ height: number; top: number } | null>(null);
  const loadingMoreRef = useRef(false);

  const list = messages[groupId] ?? [];
  const lastMessageId = list[list.length - 1]?.id;

  const grouped = useMemo(() => {
    const groups: { alias: string; messages: Message[] }[] = [];
    list.forEach((message) => {
      const lastGroup = groups[groups.length - 1];
      const lastMessage = lastGroup?.messages[lastGroup.messages.length - 1];
      const withinFiveMinutes =
        lastMessage &&
        Math.abs(new Date(message.sent_at).getTime() - new Date(lastMessage.sent_at).getTime()) <
          5 * 60 * 1000;

      if (lastGroup && lastGroup.alias === message.alias && withinFiveMinutes) {
        lastGroup.messages.push(message);
      } else {
        groups.push({ alias: message.alias, messages: [message] });
      }
    });
    return groups;
  }, [list]);

  const scrollToBottom = () => {
    const container = containerRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
  };

  const loadMessages = async (before?: string) => {
    if (!token) return;
    const isPaginating = Boolean(before);
    if (isPaginating) {
      const container = containerRef.current;
      if (container) {
        restoreScrollRef.current = {
          height: container.scrollHeight,
          top: container.scrollTop,
        };
      }
      loadingMoreRef.current = true;
      setLoadingMore(true);
    }
    const params = new URLSearchParams();
    params.set('limit', '50');
    if (before) params.set('before', before);
    try {
      const data = await apiFetch<MessageResponse[]>(
        `/api/groups/${groupId}/messages?${params.toString()}`,
        token,
      );

      const normalized = data
        .map((message) => ({
          ...message,
          reactions: message.reactions ?? {},
        }))
        .reverse();

      if (!before) {
        setMessages(groupId, normalized);
      } else {
        prependMessages(groupId, normalized);
      }
      setHasMore(data.length === 50);
    } finally {
      if (isPaginating) {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    }
  };

  useEffect(() => {
    setLoading(true);
    setHasMore(true);
    setNewCount(0);
    setIsAtBottom(true);
    loadMessages()
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [groupId, token]);

  useEffect(() => {
    if (!lastMessageId) return;
    if (isAtBottom) {
      scrollToBottom();
      setNewCount(0);
    } else {
      setNewCount((count) => count + 1);
    }
  }, [lastMessageId]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const restore = restoreScrollRef.current;
    if (!container || !restore) return;
    const delta = container.scrollHeight - restore.height;
    container.scrollTop = restore.top + delta;
    restoreScrollRef.current = null;
  }, [list.length]);

  return (
    <div className="flex-1 flex flex-col relative bg-bg-base">
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-6 py-6 space-y-6"
        onScroll={(event) => {
          const target = event.currentTarget;
          const bottomGap = target.scrollHeight - target.scrollTop - target.clientHeight;
          const atBottom = bottomGap < 120;
          setIsAtBottom(atBottom);
          if (atBottom) setNewCount(0);
          if (
            target.scrollTop < 140 &&
            hasMore &&
            !loading &&
            !loadingMoreRef.current &&
            list.length > 0
          ) {
            loadMessages(list[0]?.sent_at);
          }
        }}
      >
        {hasMore && !loading && (
          <button
            className="text-xs text-text-secondary hover:text-text-primary transition"
            onClick={() => loadMessages(list[0]?.sent_at)}
            disabled={loadingMore}
          >
            {loadingMore ? 'Loading earlier…' : 'Load earlier'}
          </button>
        )}
        {loading && (
          <div className="text-sm text-text-secondary">Loading messages…</div>
        )}
        {grouped.map((group) => (
          <motion.div
            key={`${group.alias}-${group.messages[0]?.id}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <MessageBubble group={group} onReact={sendReaction} />
          </motion.div>
        ))}
      </div>
      <ScrollToBottom
        visible={!isAtBottom}
        count={newCount}
        onClick={() => {
          scrollToBottom();
          setIsAtBottom(true);
          setNewCount(0);
        }}
      />
      <MessageInput
        onSend={sendMessage}
        onTyping={sendTyping}
        typingAliases={typingAliases[groupId] ?? []}
      />
    </div>
  );
}
