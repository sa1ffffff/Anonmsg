import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TypingIndicator from './TypingIndicator';

/* ── Emoji Data ── */
const EMOJI_CATEGORIES: { label: string; icon: string; emojis: string[] }[] = [
  {
    label: 'Smileys',
    icon: '😀',
    emojis: [
      '😀','😂','🤣','😊','😍','🥰','😘','😜','🤪','😎',
      '🤩','🥳','😏','😒','😤','😡','🥺','😢','😭','😱',
      '🤗','🤔','🤫','🤭','🫡','😶','🙄','😴','🤮','🥴',
      '😇','🫠','🤡','👻','💀','☠️','👽','🤖','😺','😸',
    ],
  },
  {
    label: 'Gestures',
    icon: '👋',
    emojis: [
      '👋','🤚','🖐️','✋','🖖','🫱','🫲','👌','🤌','🤏',
      '✌️','🤞','🫰','🤟','🤘','🤙','👈','👉','👆','👇',
      '☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','🫶',
      '👐','🤲','🤝','🙏','💪','🦾','🫵','✍️','🤳','💅',
    ],
  },
  {
    label: 'Hearts',
    icon: '❤️',
    emojis: [
      '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💕',
      '💞','💓','💗','💖','💘','💝','💟','❣️','💔','❤️‍🔥',
      '❤️‍🩹','♥️','🫀','💋','💯','💢','💥','✨','⭐','🌟',
      '💫','🔥','🌈','☀️','🌙','⚡','💧','🎵','🎶','💐',
    ],
  },
  {
    label: 'Animals',
    icon: '🐶',
    emojis: [
      '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯',
      '🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐔','🐧',
      '🐦','🐤','🦅','🦆','🦉','🐺','🐗','🐴','🦄','🐝',
      '🐛','🦋','🐌','🐞','🐢','🐍','🦎','🐙','🦑','🐠',
    ],
  },
  {
    label: 'Food',
    icon: '🍕',
    emojis: [
      '🍎','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍑','🥭',
      '🍍','🥥','🥝','🍔','🍟','🍕','🌭','🥪','🌮','🌯',
      '🍝','🍜','🍣','🍱','🥟','🍩','🍪','🎂','🍰','🧁',
      '☕','🍵','🧃','🥤','🍺','🍻','🥂','🍷','🧋','🍶',
    ],
  },
  {
    label: 'Activities',
    icon: '⚽',
    emojis: [
      '⚽','🏀','🏈','⚾','🎾','🏐','🎱','🏓','🏸','🥊',
      '🎯','🎮','🕹️','🎲','🧩','🎭','🎨','🎬','🎤','🎧',
      '🎹','🥁','🎷','🎺','🎸','🪇','🏆','🥇','🥈','🥉',
      '🎖️','🏅','🎪','🤹','🎠','🎡','🎢','🛝','🛹','🛼',
    ],
  },
  {
    label: 'Travel',
    icon: '✈️',
    emojis: [
      '🚗','🚕','🚙','🏎️','🚓','🚑','🚒','🚐','🛻','🚚',
      '✈️','🚀','🛸','🚁','⛵','🚢','🏠','🏢','🏰','🗽',
      '🗼','⛩️','🕌','🛕','🏝️','🏖️','⛰️','🏔️','🌋','🗻',
      '🌍','🌎','🌏','🧭','🗺️','🏕️','🌅','🌄','🌇','🌆',
    ],
  },
  {
    label: 'Objects',
    icon: '💡',
    emojis: [
      '📱','💻','⌨️','🖥️','🖨️','🖱️','💡','🔦','🕯️','📷',
      '📹','🎥','📺','📻','⏰','⌚','📡','🔋','🔌','💎',
      '🔑','🗝️','🔒','🔓','📦','📫','📬','✉️','📝','📎',
      '🔍','🔭','🔬','💊','🩹','🧬','🧪','🧫','🛡️','⚔️',
    ],
  },
];

interface MessageInputProps {
  onSend: (content: string) => void;
  onTyping: (typing: boolean) => void;
  typingAliases: string[];
}

export default function MessageInput({ onSend, onTyping, typingAliases }: MessageInputProps) {
  const [value, setValue] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [activeCategory, setActiveCategory] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const emojiButtonRef = useRef<HTMLButtonElement | null>(null);

  // Close picker on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        showPicker &&
        pickerRef.current &&
        !pickerRef.current.contains(e.target as Node) &&
        emojiButtonRef.current &&
        !emojiButtonRef.current.contains(e.target as Node)
      ) {
        setShowPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPicker]);

  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart ?? value.length;
      const end = textarea.selectionEnd ?? value.length;
      const newValue = value.slice(0, start) + emoji + value.slice(end);
      setValue(newValue);
      onTyping(true);
      // Restore cursor position after the emoji
      requestAnimationFrame(() => {
        const pos = start + emoji.length;
        textarea.selectionStart = pos;
        textarea.selectionEnd = pos;
        textarea.focus();
      });
    } else {
      setValue((prev) => prev + emoji);
      onTyping(true);
    }
  };

  const send = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue('');
    onTyping(false);
    setShowPicker(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = '56px';
    }
  };

  return (
    <div className="border-t border-border-subtle px-6 py-4 bg-bg-subtle" style={{ position: 'relative' }}>
      {/* ── Emoji Picker Panel ── */}
      <AnimatePresence>
        {showPicker && (
          <motion.div
            ref={pickerRef}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              bottom: '100%',
              left: '24px',
              marginBottom: '8px',
              width: '352px',
              maxHeight: '380px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)',
              backdropFilter: 'blur(20px)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              zIndex: 50,
            }}
          >
            {/* Category tabs */}
            <div
              style={{
                display: 'flex',
                gap: '2px',
                padding: '8px 8px 0',
                borderBottom: '1px solid var(--border-subtle)',
                overflowX: 'auto',
                flexShrink: 0,
              }}
            >
              {EMOJI_CATEGORIES.map((cat, idx) => (
                <button
                  key={cat.label}
                  onClick={() => setActiveCategory(idx)}
                  title={cat.label}
                  style={{
                    flex: '0 0 auto',
                    padding: '6px 8px',
                    fontSize: '18px',
                    lineHeight: 1,
                    background: activeCategory === idx ? 'var(--accent-dim)' : 'transparent',
                    border: 'none',
                    borderRadius: '8px 8px 0 0',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                    borderBottom: activeCategory === idx ? '2px solid var(--accent)' : '2px solid transparent',
                  }}
                >
                  {cat.icon}
                </button>
              ))}
            </div>

            {/* Category label */}
            <div
              style={{
                padding: '8px 12px 4px',
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-body)',
                flexShrink: 0,
              }}
            >
              {EMOJI_CATEGORIES[activeCategory].label}
            </div>

            {/* Emoji grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(8, 1fr)',
                gap: '2px',
                padding: '4px 8px 10px',
                overflowY: 'auto',
                flex: 1,
              }}
            >
              {EMOJI_CATEGORIES[activeCategory].emojis.map((emoji, i) => (
                <button
                  key={`${emoji}-${i}`}
                  onClick={() => insertEmoji(emoji)}
                  style={{
                    fontSize: '22px',
                    lineHeight: 1,
                    padding: '6px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'background 0.12s, transform 0.12s',
                  }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLButtonElement).style.background = 'var(--bg-hover)';
                    (e.target as HTMLButtonElement).style.transform = 'scale(1.2)';
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLButtonElement).style.background = 'transparent';
                    (e.target as HTMLButtonElement).style.transform = 'scale(1)';
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Input Row ── */}
      <div className="flex gap-3 items-end">
        {/* Emoji toggle button */}
        <button
          ref={emojiButtonRef}
          onClick={() => setShowPicker((prev) => !prev)}
          title="Insert emoji"
          style={{
            height: '38px',
            width: '38px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            border: showPicker ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
            background: showPicker ? 'var(--accent-dim)' : 'var(--bg-elevated)',
            cursor: 'pointer',
            fontSize: '20px',
            transition: 'all 0.15s',
            flexShrink: 0,
          }}
        >
          😊
        </button>

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
