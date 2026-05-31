import { AnimatePresence, motion } from 'framer-motion';

interface ScrollToBottomProps {
  visible: boolean;
  count: number;
  onClick: () => void;
}

export default function ScrollToBottom({ visible, count, onClick }: ScrollToBottomProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, y: 8, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.9 }}
          transition={{ duration: 0.18 }}
          className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-bg-elevated border border-border-subtle text-xs px-4 py-2 rounded-full shadow-soft hover:border-accent transition"
          onClick={onClick}
        >
          ↓ {count > 0 ? `${count} new messages` : 'Jump to latest'}
        </motion.button>
      )}
    </AnimatePresence>
  );
}
