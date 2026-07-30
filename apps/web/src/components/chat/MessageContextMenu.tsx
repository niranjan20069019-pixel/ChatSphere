'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Reply, Forward, Trash2, Star } from 'lucide-react';
import { Message } from '@/types';

interface MessageContextMenuProps {
  isOpen: boolean;
  onClose: () => void;
  message: Message | null;
  isMe: boolean;
  position?: { x: number; y: number };
  onReact: (emoji: string) => void;
  onReply: () => void;
  onCopy: () => void;
  onForward: () => void;
  onDelete: (forEveryone: boolean) => void;
  onStar: () => void;
}

const REACTIONS = ['🔥', '🙌', '😭', '🙈', '🙏', '😆'];

export function MessageContextMenu({
  isOpen,
  onClose,
  message,
  isMe,
  position,
  onReact,
  onReply,
  onCopy,
  onForward,
  onDelete,
  onStar,
}: MessageContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !message) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.15 }}
        className="fixed z-50 w-64 rounded-2xl bg-white shadow-2xl"
        style={{
          left: position?.x ?? '50%',
          top: position?.y ?? '50%',
          transform: 'translate(-50%, -50%)',
        }}
      >
        {/* Reactions */}
        <div className="flex items-center justify-around border-b border-[var(--card-border)] px-3 py-3">
          {REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                onReact(emoji);
                onClose();
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full text-xl transition hover:bg-black/[0.04] active:scale-110"
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="py-1">
          <button
            onClick={() => { onReply(); onClose(); }}
            className="flex w-full items-center gap-3 px-4 py-3 text-sm transition hover:bg-black/[0.03]"
          >
            <Reply className="h-4 w-4 text-[var(--muted)]" />
            Reply
          </button>
          <button
            onClick={() => { onStar(); onClose(); }}
            className="flex w-full items-center gap-3 px-4 py-3 text-sm transition hover:bg-black/[0.03]"
          >
            <Star className="h-4 w-4 text-[var(--muted)]" />
            Star
          </button>
          <button
            onClick={() => { onCopy(); onClose(); }}
            className="flex w-full items-center gap-3 px-4 py-3 text-sm transition hover:bg-black/[0.03]"
          >
            <Copy className="h-4 w-4 text-[var(--muted)]" />
            Copy
          </button>
          <button
            onClick={() => { onForward(); onClose(); }}
            className="flex w-full items-center gap-3 px-4 py-3 text-sm transition hover:bg-black/[0.03]"
          >
            <Forward className="h-4 w-4 text-[var(--muted)]" />
            Forward
          </button>
          {isMe && (
            <button
              onClick={() => { onDelete(true); onClose(); }}
              className="flex w-full items-center gap-3 px-4 py-3 text-sm text-[var(--danger)] transition hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
              Delete for everyone
            </button>
          )}
          <button
            onClick={() => { onDelete(false); onClose(); }}
            className="flex w-full items-center gap-3 px-4 py-3 text-sm text-[var(--danger)] transition hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
            Delete for me
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
