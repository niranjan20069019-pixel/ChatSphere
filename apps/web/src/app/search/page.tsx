'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Search, UserPlus, Flag } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { usersApi, friendsApi } from '@/lib/api';
import { User } from '@/types';
import { useChatStore } from '@/store/chatStore';
import { useRouter } from 'next/navigation';

export default function SearchPage() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const { setActivePeer, fetchMessages, onlineUsers } = useChatStore();

  const search = async () => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const res = await usersApi.search(q.trim());
      setUsers(res.data.data.users);
    } finally {
      setLoading(false);
    }
  };

  const sendRequest = async (userId: string) => {
    try {
      await friendsApi.sendRequest(userId);
      toast.success('Friend request sent');
    } catch {
      toast.error('Failed to send request');
    }
  };

  const report = async (userId: string) => {
    const reason = prompt('Reason for report:');
    if (!reason) return;
    await friendsApi.report({ reportedId: userId, reason });
    toast.success('Report submitted');
  };

  const openChat = (peer: User) => {
    setActivePeer(peer);
    fetchMessages(peer.id, true);
    router.push('/dashboard');
  };

  return (
    <AppShell>
      <div className="mx-auto h-full max-w-2xl overflow-y-auto p-6">
        <h1 className="mb-6 text-2xl font-semibold">Search users</h1>
        <div className="mb-6 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && search()}
              placeholder="Search by username or display name..."
              className="input-field pl-10"
            />
          </div>
          <Button onClick={search} loading={loading}>
            Search
          </Button>
        </div>

        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="glass flex items-center gap-3 rounded-2xl p-4">
              <Avatar
                src={u.avatarUrl}
                name={u.displayName}
                online={onlineUsers.has(u.id)}
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{u.displayName}</p>
                <p className="text-xs text-[var(--muted)]">@{u.username}</p>
                {u.bio && <p className="mt-1 truncate text-xs text-[var(--muted)]">{u.bio}</p>}
              </div>
              <Button size="sm" onClick={() => openChat(u)}>
                Message
              </Button>
              <Button size="sm" variant="secondary" onClick={() => sendRequest(u.id)}>
                <UserPlus className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => report(u.id)}>
                <Flag className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
