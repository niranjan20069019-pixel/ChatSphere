'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, CheckCheck } from 'lucide-react';
import { Message } from '@/types';
import { cn, formatMessageTime, formatFileSize } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useChatStore } from '@/store/chatStore';
import { getSocket } from '@/lib/socket';
import { messagesApi } from '@/lib/api';
import { Avatar } from '@/components/ui/Avatar';
import { MessageContextMenu } from './MessageContextMenu';

interface MessageBubbleProps {
  message: Message;
  showAvatar?: boolean;
}

export function MessageBubble({ message, showAvatar }: MessageBubbleProps) {
  const user = useAuthStore((s) => s.user);
  const { setReplyTo, updateMessage, removeMessage } = useChatStore();
  const [contextMenu, setContextMenu] = useState<{
    open: boolean;
    x: number;
    y: number;
  }>({ open: false, x: 0, y: 0 });
  const isMe = message.senderId === user?.id;

  if (message.deletedForAll || (message.isDeleted && isMe)) {
    return (
      <div className={cn('flex', isMe ? 'justify-end' : 'justify-start')}>
        <div className="rounded-2xl bg-black/[0.04] px-4 py-2.5 text-sm italic text-[var(--muted)]">
          This message was deleted
        </div>
      </div>
    );
  }

  const handleReact = (emoji: string) => {
    getSocket()?.emit('message:react', { messageId: message.id, emoji });
    messagesApi.react(message.id, emoji).then((res) => {
      updateMessage(message.id, { reactions: res.data.data.reactions });
    });
  };

  const handleDelete = async (forEveryone: boolean) => {
    await messagesApi.delete(message.id, forEveryone);
    if (forEveryone) {
      getSocket()?.emit('message:delete', { messageId: message.id, forEveryone: true });
      updateMessage(message.id, { isDeleted: true, deletedForAll: true, content: null });
    } else {
      removeMessage(message.id);
    }
  };

  const handleStar = async () => {
    await messagesApi.star(message.id);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content || '');
  };

  const handleLongPress = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const touch = 'touches' in e ? e.touches[0] : e;
    setContextMenu({
      open: true,
      x: touch.clientX,
      y: rect.top - 10,
    });
  };

  const renderContent = () => {
    if (message.type === 'IMAGE' && message.fileUrl) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={message.fileUrl}
          alt={message.fileName || 'Image'}
          className="max-h-64 max-w-xs rounded-xl object-cover"
        />
      );
    }
    if (message.type === 'VIDEO' && message.fileUrl) {
      return (
        <video src={message.fileUrl} controls className="max-h-64 max-w-xs rounded-xl" />
      );
    }
    if ((message.type === 'AUDIO' || message.type === 'VOICE') && message.fileUrl) {
      return <audio src={message.fileUrl} controls className="max-w-xs" />;
    }
    if (message.type === 'DOCUMENT' && message.fileUrl) {
      return (
        <a
          href={message.fileUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 underline"
        >
          📄 {message.fileName || 'Document'}
          {message.fileSize && (
            <span className="text-xs opacity-70">({formatFileSize(message.fileSize)})</span>
          )}
        </a>
      );
    }
    if (message.type === 'GIF' && message.fileUrl) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={message.fileUrl} alt="GIF" className="max-h-48 max-w-xs rounded-xl" />
      );
    }
    return <p className="whitespace-pre-wrap break-words">{message.content}</p>;
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn('flex gap-2', isMe ? 'flex-row-reverse' : 'flex-row')}
      >
        {showAvatar && !isMe ? (
          <Avatar
            src={message.sender?.avatarUrl}
            name={message.sender?.displayName || 'U'}
            size="sm"
            className="mt-1"
          />
        ) : (
          <div className="w-8 shrink-0" />
        )}

        <div className={cn('max-w-[75%] space-y-0.5', isMe ? 'items-end' : 'items-start')}>
          {/* Reply preview */}
          {message.replyTo && (
            <div
              className={cn(
                'rounded-xl border-l-2 px-3 py-1.5 text-xs',
                isMe
                  ? 'border-[#1a1a1a]/30 bg-[#1a1a1a]/5'
                  : 'border-[var(--card-border)] bg-black/[0.03]'
              )}
            >
              <p className="font-medium">{message.replyTo.sender?.displayName}</p>
              <p className="truncate text-[var(--muted)]">{message.replyTo.content}</p>
            </div>
          )}

          {/* Bubble */}
          <div
            onContextMenu={handleLongPress}
            onTouchStart={(e) => {
              const timer = setTimeout(() => handleLongPress(e), 500);
              (e.currentTarget as HTMLElement).dataset.timer = String(timer);
            }}
            onTouchEnd={(e) => {
              const timer = (e.currentTarget as HTMLElement).dataset.timer;
              if (timer) clearTimeout(Number(timer));
            }}
            onTouchMove={(e) => {
              const timer = (e.currentTarget as HTMLElement).dataset.timer;
              if (timer) clearTimeout(Number(timer));
            }}
            className={cn(isMe ? 'message-bubble-me' : 'message-bubble-them')}
          >
            {renderContent()}
            <div
              className={cn(
                'mt-0.5 flex items-center justify-end gap-1 text-[10px]',
                isMe ? 'text-[#1a1a1a]/60' : 'text-[var(--muted)]'
              )}
            >
              {message.isEdited && <span>edited</span>}
              <span>{formatMessageTime(message.createdAt)}</span>
              {isMe &&
                (message.readAt ? (
                  <CheckCheck className="h-3.5 w-3.5 text-[#34c759]" />
                ) : message.deliveredAt ? (
                  <CheckCheck className="h-3.5 w-3.5" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                ))}
            </div>
          </div>

          {/* Reactions */}
          {message.reactions && message.reactions.length > 0 && (
            <div className={cn('flex flex-wrap gap-1', isMe ? 'justify-end' : 'justify-start')}>
              {Object.entries(
                message.reactions.reduce(
                  (acc, r) => {
                    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                    return acc;
                  },
                  {} as Record<string, number>
                )
              ).map(([emoji, count]) => (
                <button
                  key={emoji}
                  onClick={() => handleReact(emoji)}
                  className="rounded-full bg-white px-2 py-0.5 text-xs shadow-sm"
                >
                  {emoji} {count}
                </button>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      <MessageContextMenu
        isOpen={contextMenu.open}
        onClose={() => setContextMenu({ open: false, x: 0, y: 0 })}
        message={message}
        isMe={isMe}
        position={{ x: contextMenu.x, y: contextMenu.y }}
        onReact={handleReact}
        onReply={() => setReplyTo(message)}
        onCopy={handleCopy}
        onForward={() => setReplyTo(message)}
        onDelete={handleDelete}
        onStar={handleStar}
      />
    </>
  );
}
