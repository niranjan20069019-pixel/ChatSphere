'use client';

import { AppShell } from '@/components/layout/AppShell';
import { ChatList } from '@/components/chat/ChatList';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { useChatStore } from '@/store/chatStore';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const activePeer = useChatStore((s) => s.activePeer);

  return (
    <AppShell>
      <div className="flex h-full">
        <div className={cn('h-full', activePeer ? 'hidden md:flex' : 'flex', 'w-full')}>
          <ChatList />
        </div>
        <div className={cn('h-full flex-1', !activePeer && 'hidden md:flex')}>
          <ChatWindow />
        </div>
      </div>
    </AppShell>
  );
}
