'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Phone,
  Video,
  MoreVertical,
  Search,
  Archive,
  VolumeX,
  Volume2,
  Pin,
  ChevronLeft,
} from 'lucide-react';
import { useChatStore } from '@/store/chatStore';
import { Avatar } from '@/components/ui/Avatar';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { formatLastSeen } from '@/lib/utils';
import { messagesApi } from '@/lib/api';
import { initiateCall } from '@/components/call/CallOverlay';
import toast from 'react-hot-toast';

export function ChatWindow() {
  const {

    activePeer,
    messages,
    typingUsers,
    onlineUsers,
    hasMore,
    isLoadingMessages,
    fetchMessages,
    setActivePeer,
  } = useChatStore();
  const listRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<typeof messages>([]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages.length, activePeer?.id]);

  const onScroll = useCallback(() => {
    if (!listRef.current || !activePeer || !hasMore || isLoadingMessages) return;
    if (listRef.current.scrollTop < 80) {
      const prevHeight = listRef.current.scrollHeight;
      fetchMessages(activePeer.id).then(() => {
        if (listRef.current) {
          listRef.current.scrollTop = listRef.current.scrollHeight - prevHeight;
        }
      });
    }
  }, [activePeer, hasMore, isLoadingMessages, fetchMessages]);

  const handleSearch = async () => {
    if (!searchQ || !activePeer) return;
    const res = await messagesApi.search(searchQ, activePeer.id);
    setSearchResults(res.data.data.messages);
  };

  const updateSetting = async (data: Record<string, unknown>) => {
    if (!activePeer) return;
    await messagesApi.updateSetting(activePeer.id, data);
    toast.success('Chat settings updated');
    setMenuOpen(false);
  };

  if (!activePeer) {
    return (
      <div className="hidden flex-1 flex-col items-center justify-center md:flex">
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-[#f5dd42]/20">
            <span className="text-3xl">💬</span>
          </div>
          <h2 className="text-xl font-semibold">Welcome to ChatSphere</h2>
          <p className="mt-2 max-w-sm text-sm text-[var(--muted)]">
            Select a conversation or find friends to start messaging in real time.
          </p>
        </div>
      </div>
    );
  }

  const isOnline = onlineUsers.has(activePeer.id);
  const isTyping = typingUsers.has(activePeer.id);

  return (
    <div className="flex h-full flex-1 flex-col bg-[var(--background)]">
      {/* Header */}
      <div className="glass flex items-center justify-between border-b border-[var(--card-border)] px-3 py-2.5">
        <div className="flex items-center gap-3">
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-black/[0.04] md:hidden"
            onClick={() => setActivePeer(null)}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <Avatar
            src={activePeer.avatarUrl}
            name={activePeer.displayName}
            online={isOnline}
          />
          <div>
            <h2 className="font-semibold text-sm">{activePeer.displayName}</h2>
            <p className="text-xs text-[var(--muted)]">
              {isTyping
                ? 'typing...'
                : isOnline
                  ? 'Online'
                  : `Last seen ${formatLastSeen(activePeer.lastSeenAt)}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => initiateCall(activePeer.id, activePeer, 'VOICE')}
            className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-black/[0.04]"
            title="Voice call"
          >
            <Phone className="h-5 w-5" />
          </button>
          <button
            onClick={() => initiateCall(activePeer.id, activePeer, 'VIDEO')}
            className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-black/[0.04]"
            title="Video call"
          >
            <Video className="h-5 w-5" />
          </button>
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-black/[0.04]"
          >
            <Search className="h-5 w-5" />
          </button>
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-black/[0.04]"
            >
              <MoreVertical className="h-5 w-5" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 z-20 mt-1 w-44 rounded-2xl bg-white py-1 shadow-2xl">
                <button
                  onClick={() => updateSetting({ isMuted: true })}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-black/[0.03]"
                >
                  <VolumeX className="h-4 w-4 text-[var(--muted)]" /> Mute
                </button>
                <button
                  onClick={() => updateSetting({ isMuted: false })}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-black/[0.03]"
                >
                  <Volume2 className="h-4 w-4 text-[var(--muted)]" /> Unmute
                </button>
                <button
                  onClick={() => updateSetting({ isPinned: true })}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-black/[0.03]"
                >
                  <Pin className="h-4 w-4 text-[var(--muted)]" /> Pin chat
                </button>
                <button
                  onClick={() => updateSetting({ isArchived: true })}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-black/[0.03]"
                >
                  <Archive className="h-4 w-4 text-[var(--muted)]" /> Archive
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search bar */}
      {searchOpen && (
        <div className="flex gap-2 border-b border-[var(--card-border)] bg-white px-3 py-2.5">
          <input
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search in conversation..."
            className="flex-1 rounded-xl bg-black/[0.04] px-3 py-2 text-sm outline-none"
          />
          <button
            onClick={handleSearch}
            className="rounded-xl bg-[#1a1a1a] px-4 py-2 text-sm font-medium text-white"
          >
            Search
          </button>
        </div>
      )}

      {searchResults.length > 0 && (
        <div className="max-h-36 overflow-y-auto border-b border-[var(--card-border)] bg-white px-3 py-2">
          {searchResults.map((m) => (
            <div
              key={m.id}
              className="rounded-xl px-3 py-2 text-sm transition hover:bg-black/[0.03]"
            >
              {m.content}
            </div>
          ))}
        </div>
      )}

      {/* Messages */}
      <div
        ref={listRef}
        onScroll={onScroll}
        className="flex-1 space-y-1 overflow-y-auto px-3 py-3"
      >
        {isLoadingMessages && (
          <div className="flex justify-center py-4">
            <div className="flex gap-1">
              <span className="h-2 w-2 rounded-full bg-[var(--muted)]" style={{ animation: 'pulse-dot 1.2s infinite' }} />
              <span className="h-2 w-2 rounded-full bg-[var(--muted)]" style={{ animation: 'pulse-dot 1.2s infinite 0.2s' }} />
              <span className="h-2 w-2 rounded-full bg-[var(--muted)]" style={{ animation: 'pulse-dot 1.2s infinite 0.4s' }} />
            </div>
          </div>
        )}
        {messages.filter((m, i, arr) => arr.findIndex((x) => x.id === m.id) === i).map((m, i, deduped) => (
          <MessageBubble
            key={m.id}
            message={m}
            showAvatar={i === 0 || deduped[i - 1]?.senderId !== m.senderId}
          />
        ))}
      </div>

      <MessageInput />
    </div>
  );
}
