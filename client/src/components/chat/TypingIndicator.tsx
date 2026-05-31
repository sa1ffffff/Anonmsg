import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface TypingIndicatorProps {
  aliases: string[];
}

export default function TypingIndicator({ aliases }: TypingIndicatorProps) {
  const label = useMemo(() => {
    if (aliases.length === 0) return '';
    if (aliases.length === 1) return `${aliases[0]} is typing`;
    if (aliases.length === 2) return `${aliases[0]} and ${aliases[1]} are typing`;
    return `${aliases[0]} and ${aliases.length - 1} others are typing`;
  }, [aliases]);

  return (
    <AnimatePresence>
      {label && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="text-xs text-text-secondary font-mono flex items-center gap-2 h-7"
        >
          {label}
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
