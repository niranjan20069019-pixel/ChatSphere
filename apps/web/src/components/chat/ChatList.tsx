'use client';

import { useEffect, useState } from 'react';
import { Search, Pin, VolumeX, Archive } from 'lucide-react';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import { Avatar } from '@/components/ui/Avatar';
import { StoryList } from './StoryList';
import { NewChatFAB } from './NewChatFAB';
import { NewChatBottomSheet } from './NewChatBottomSheet';
import { cn, formatMessageTime } from '@/lib/utils';
import { User } from '@/types';

export function ChatList() {
  const user = useAuthStore((s) => s.user);
  const {
    conversations,
    activePeer,
    setActivePeer,
    fetchConversations,
    fetchMessages,
    onlineUsers,
    searchQuery,
    setSearchQuery,
  } = useChatStore();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [showNewChat, setShowNewChat] = useState(false);

  useEffect(() => {
    fetchConversations();
  }, []);

  const filtered = conversations.filter((c) => {
    const matchesSearch =
      !searchQuery ||
      c.peer.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.peer.username.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' || c.unreadCount > 0;
    return matchesSearch && matchesFilter;
  });

  const openChat = (peer: User) => {
    setActivePeer(peer);
    fetchMessages(peer.id, true);
  };

  const friends = conversations
    .filter((c) => onlineUsers.has(c.peer.id))
    .map((c) => c.peer)
    .slice(0, 15);

  return (
    <div className="flex h-full w-full flex-col border-r border-[var(--card-border)] bg-white md:w-80 lg:w-96">
      <div className="px-4 pb-1 pt-3">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">{user?.displayName?.split(' ')[0] || 'Chats'}</h1>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setFilter(filter === 'unread' ? 'all' : 'unread')}
              className={cn(
                'rounded-full px-3 py-1 text-[11px] font-semibold transition',
                filter === 'unread'
                  ? 'bg-[#1a1a1a] text-white'
                  : 'bg-black/[0.04] text-[var(--muted)]'
              )}
            >
              {filter === 'unread' ? 'All' : 'Unread'}
            </button>
          </div>
        </div>

        <div className="relative mb-2">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search messages..."
            className="w-full rounded-full bg-black/[0.04] py-2.5 pl-10 pr-4 text-sm outline-none transition placeholder:text-[var(--muted)] focus:bg-black/[0.06]"
          />
        </div>
      </div>

      {/* Stories */}
      <div className="border-b border-[var(--card-border)]">
        <StoryList friends={friends} />
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-20 text-center text-[var(--muted)]">
            <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-black/[0.03]">
              <Search className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium">No conversations yet</p>
            <p className="text-xs">Tap the button below to start chatting</p>
          </div>
        ) : (
          filtered.filter((c, i, arr) => arr.findIndex((x) => x.peer.id === c.peer.id) === i).map((c) => (
            <button
              key={c.peer.id}
              onClick={() => openChat(c.peer)}
              className={cn(
                'chat-item w-full text-left',
                activePeer?.id === c.peer.id && 'bg-black/[0.02]'
              )}
            >
              <div className="relative shrink-0">
                <Avatar
                  src={c.peer.avatarUrl}
                  name={c.peer.displayName}
                  size="md"
                  online={onlineUsers.has(c.peer.id)}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium text-sm">{c.peer.displayName}</span>
                  <span className="shrink-0 text-[11px] text-[var(--muted)]">
                    {c.lastMessage.createdAt
                      ? formatMessageTime(c.lastMessage.createdAt)
                      : ''}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-[13px] text-[var(--muted)]">
                    {c.lastMessage.isDeleted
                      ? 'Message deleted'
                      : c.lastMessage.content
                        ? c.lastMessage.content
                        : `${c.lastMessage.type.toLowerCase()} file`}
                  </p>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {c.isPinned && <Pin className="h-3 w-3 text-[var(--muted)]" />}
                    {c.isMuted && <VolumeX className="h-3 w-3 text-[var(--muted)]" />}
                    {c.isArchived && <Archive className="h-3 w-3 text-[var(--muted)]" />}
                    {c.unreadCount > 0 && (
                      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--accent)] px-1.5 text-[10px] font-bold text-[var(--accent-foreground)]">
                        {c.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      <NewChatFAB onClick={() => setShowNewChat(true)} />
      <NewChatBottomSheet isOpen={showNewChat} onClose={() => setShowNewChat(false)} />
    </div>
  );
}
