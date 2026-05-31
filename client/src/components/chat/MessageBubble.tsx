import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { aliasColor, aliasInitials } from '../../lib/aliasColor';
import { formatTimeAgo } from '../../lib/time';
import { REACTION_EMOJIS } from '../../lib/reactions';
import type { Message } from '../../store/chatStore';

interface MessageGroup {
  alias: string;
  messages: Message[];
}

interface MessageBubbleProps {
  group: MessageGroup;
  onReact: (messageId: string, emoji: string) => void;
}

export default function MessageBubble({ group, onReact }: MessageBubbleProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const alias = group.alias;
  const color = aliasColor(alias);

  return (
    <div className="flex gap-4">
      <div
        className="h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-mono"
        style={{ backgroundColor: color, color: 'var(--bg-base)' }}
      >
        {aliasInitials(alias)}
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-text-secondary">{alias}</span>
          <span className="text-xs text-text-muted">•</span>
          <span className="text-xs text-text-muted font-mono">
            {formatTimeAgo(group.messages[0]?.sent_at)}
          </span>
        </div>
        <div className="space-y-3">
          {group.messages.map((message) => {
            const reactions = message.reactions ?? {};
            return (
              <div
                key={message.id}
                className="relative group/message px-3 py-2 rounded-md hover:bg-bg-hover transition"
                onMouseEnter={() => setHoveredId(message.id)}
                onMouseLeave={() => setHoveredId((current) => (current === message.id ? null : current))}
              >
                <div className="text-[14.5px] leading-[1.55] whitespace-pre-wrap">
                  {message.content}
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {Object.entries(reactions).map(([emoji, count]) => (
                    <button
                      key={`${message.id}-${emoji}`}
                      className="px-2 py-1 text-xs rounded-full border border-border-subtle text-text-secondary hover:text-text-primary transition"
                      onClick={() => onReact(message.id, emoji)}
                    >
                      {emoji} {count}
                    </button>
                  ))}
                </div>
                <AnimatePresence>
                  {hoveredId === message.id && (
                    <motion.div
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute -top-8 right-0 flex gap-2 bg-bg-elevated border border-border-subtle rounded-full px-3 py-1 shadow-soft"
                    >
                      {REACTION_EMOJIS.map((emoji) => (
                        <button
                          key={`${message.id}-${emoji}`}
                          className="text-sm hover:scale-110 transition"
                          onClick={() => onReact(message.id, emoji)}
                        >
                          {emoji}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
