import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import TypingIndicator from './TypingIndicator';

interface MessageInputProps {
  onSend: (content: string) => void;
  onTyping: (typing: boolean) => void;
  typingAliases: string[];
}

export default function MessageInput({ onSend, onTyping, typingAliases }: MessageInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const send = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue('');
    onTyping(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = '56px';
    }
  };

  return (
    <div className="border-t border-border-subtle px-6 py-4 bg-bg-subtle">
      <div className="flex gap-4 items-end">
        <textarea
          ref={textareaRef}
          className="flex-1 bg-bg-elevated border border-border-subtle rounded-md px-4 py-3 text-[14.5px] resize-none min-h-[56px] max-h-40 placeholder:text-text-muted focus:border-border-strong focus:shadow-[0_0_0_3px_var(--accent-dim)] transition"
          placeholder="Say something..."
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            onTyping(event.target.value.length > 0);
            const element = event.target;
            element.style.height = 'auto';
            const nextHeight = Math.min(element.scrollHeight, 160);
            element.style.height = `${nextHeight}px`;
          }}
          onBlur={() => onTyping(false)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              send();
            }
          }}
        />
        <motion.button
          whileTap={{ scale: 0.97 }}
          className="h-9 w-9 rounded-full bg-accent text-black font-medium hover:brightness-110 transition disabled:opacity-40"
          onClick={send}
          disabled={!value.trim()}
        >
          →
        </motion.button>
      </div>
      <div className="text-xs text-text-muted mt-2">
        Press Enter to send · Shift+Enter for newline
      </div>
      <div className="mt-2 h-7">
        <TypingIndicator aliases={typingAliases} />
      </div>
    </div>
  );
}
