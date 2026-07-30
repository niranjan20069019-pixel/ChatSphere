'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Check, X, UserMinus, Ban } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { friendsApi } from '@/lib/api';
import { Friendship, User } from '@/types';
import { useChatStore } from '@/store/chatStore';
import { useRouter } from 'next/navigation';

export default function FriendsPage() {
  const router = useRouter();
  const [friends, setFriends] = useState<User[]>([]);
  const [incoming, setIncoming] = useState<Friendship[]>([]);
  const [outgoing, setOutgoing] = useState<Friendship[]>([]);
  const [tab, setTab] = useState<'friends' | 'requests'>('friends');
  const { setActivePeer, fetchMessages, onlineUsers } = useChatStore();

  const load = async () => {
    const [f, r] = await Promise.all([friendsApi.list(), friendsApi.requests()]);
    setFriends(f.data.data.friends);
    setIncoming(r.data.data.incoming);
    setOutgoing(r.data.data.outgoing);
  };

  useEffect(() => {
    load();
  }, []);

  const accept = async (id: string) => {
    await friendsApi.accept(id);
    toast.success('Friend request accepted');
    load();
  };

  const reject = async (id: string) => {
    await friendsApi.reject(id);
    toast.success('Request rejected');
    load();
  };

  const cancel = async (id: string) => {
    await friendsApi.cancel(id);
    toast.success('Request cancelled');
    load();
  };

  const remove = async (userId: string) => {
    await friendsApi.remove(userId);
    toast.success('Friend removed');
    load();
  };

  const block = async (userId: string) => {
    await friendsApi.block(userId);
    toast.success('User blocked');
    load();
  };

  const openChat = (peer: User) => {
    setActivePeer(peer);
    fetchMessages(peer.id, true);
    router.push('/dashboard');
  };

  return (
    <AppShell>
      <div className="mx-auto h-full max-w-3xl overflow-y-auto p-6">
        <h1 className="mb-6 text-2xl font-semibold">Friends</h1>

        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setTab('friends')}
            className={`rounded-xl px-4 py-2 text-sm font-medium ${tab === 'friends' ? 'bg-brand-600 text-white' : 'bg-black/5 dark:bg-white/5'}`}
          >
            Friends ({friends.length})
          </button>
          <button
            onClick={() => setTab('requests')}
            className={`rounded-xl px-4 py-2 text-sm font-medium ${tab === 'requests' ? 'bg-brand-600 text-white' : 'bg-black/5 dark:bg-white/5'}`}
          >
            Requests ({incoming.length + outgoing.length})
          </button>
        </div>

        {tab === 'friends' && (
          <div className="space-y-2">
            {friends.length === 0 && (
              <p className="py-12 text-center text-sm text-[var(--muted)]">
                No friends yet. Search for users to connect!
              </p>
            )}
            {friends.map((f) => (
              <div key={f.id} className="glass flex items-center gap-3 rounded-2xl p-4">
                <Avatar src={f.avatarUrl} name={f.displayName} online={onlineUsers.has(f.id)} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{f.displayName}</p>
                  <p className="text-xs text-[var(--muted)]">@{f.username}</p>
                </div>
                <Button size="sm" onClick={() => openChat(f)}>
                  Message
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove(f.id)}>
                  <UserMinus className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => block(f.id)}>
                  <Ban className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {tab === 'requests' && (
          <div className="space-y-6">
            <div>
              <h2 className="mb-3 text-sm font-medium text-[var(--muted)]">Incoming</h2>
              {incoming.length === 0 && (
                <p className="text-sm text-[var(--muted)]">No incoming requests</p>
              )}
              {incoming.map((r) => (
                <div key={r.id} className="glass mb-2 flex items-center gap-3 rounded-2xl p-4">
                  <Avatar
                    src={r.requester?.avatarUrl}
                    name={r.requester?.displayName || 'U'}
                  />
                  <div className="flex-1">
                    <p className="font-medium">{r.requester?.displayName}</p>
                    <p className="text-xs text-[var(--muted)]">@{r.requester?.username}</p>
                  </div>
                  <Button size="sm" onClick={() => accept(r.id)}>
                    <Check className="h-4 w-4" /> Accept
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => reject(r.id)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div>
              <h2 className="mb-3 text-sm font-medium text-[var(--muted)]">Outgoing</h2>
              {outgoing.map((r) => (
                <div key={r.id} className="glass mb-2 flex items-center gap-3 rounded-2xl p-4">
                  <Avatar
                    src={r.addressee?.avatarUrl}
                    name={r.addressee?.displayName || 'U'}
                  />
                  <div className="flex-1">
                    <p className="font-medium">{r.addressee?.displayName}</p>
                    <p className="text-xs text-[var(--muted)]">@{r.addressee?.username}</p>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => cancel(r.id)}>
                    Cancel
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
