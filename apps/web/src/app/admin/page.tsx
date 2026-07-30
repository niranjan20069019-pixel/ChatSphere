'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Users,
  MessageSquare,
  UsersRound,
  Flag,
  Ban,
  Shield,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { adminApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';

interface Stats {
  users: {
    total: number;
    active: number;
    banned: number;
    suspended: number;
    online: number;
    newLast7Days: number;
  };
  messages: { total: number; newLast7Days: number };
  groups: { total: number };
  reports: { total: number; pending: number };
}

export default function AdminPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<Array<Record<string, unknown>>>([]);
  const [reports, setReports] = useState<Array<Record<string, unknown>>>([]);
  const [messageStats, setMessageStats] = useState<
    Array<{ date: string; total: number; directMessages: number; groupMessages: number }>
  >([]);
  const [tab, setTab] = useState<'overview' | 'users' | 'reports'>('overview');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (user && user.role !== 'ADMIN' && user.role !== 'MODERATOR') {
      router.replace('/dashboard');
    }
  }, [user, router]);

  useEffect(() => {
    adminApi.stats().then((r) => setStats(r.data.data));
    adminApi.messageStats().then((r) => setMessageStats(r.data.data.stats));
  }, []);

  const loadUsers = async () => {
    const res = await adminApi.users({ q: search || undefined });
    setUsers(res.data.data.users);
  };

  const loadReports = async () => {
    const res = await adminApi.reports();
    setReports(res.data.data.reports);
  };

  useEffect(() => {
    if (tab === 'users') loadUsers();
    if (tab === 'reports') loadReports();
  }, [tab]);

  const updateUser = async (id: string, data: Record<string, unknown>) => {
    await adminApi.updateUser(id, data);
    toast.success('User updated');
    loadUsers();
    adminApi.stats().then((r) => setStats(r.data.data));
  };

  const updateReport = async (id: string, status: string) => {
    await adminApi.updateReport(id, { status });
    toast.success('Report updated');
    loadReports();
  };

  if (!stats) {
    return (
      <AppShell>
        <div className="flex h-full items-center justify-center text-[var(--muted)]">
          Loading admin dashboard...
        </div>
      </AppShell>
    );
  }

  const cards = [
    { label: 'Total users', value: stats.users.total, icon: Users, sub: `${stats.users.online} online` },
    { label: 'Messages', value: stats.messages.total, icon: MessageSquare, sub: `+${stats.messages.newLast7Days} this week` },
    { label: 'Groups', value: stats.groups.total, icon: UsersRound, sub: 'Active communities' },
    { label: 'Reports', value: stats.reports.pending, icon: Flag, sub: `${stats.reports.total} total` },
  ];

  const maxMsg = Math.max(...messageStats.map((s) => s.total), 1);

  return (
    <AppShell>
      <div className="h-full overflow-y-auto p-6">
        <div className="mb-6 flex items-center gap-3">
          <Shield className="h-6 w-6 text-brand-500" />
          <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        </div>

        <div className="mb-6 flex gap-2">
          {(['overview', 'users', 'reports'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-xl px-4 py-2 text-sm font-medium capitalize ${
                tab === t ? 'bg-brand-600 text-white' : 'bg-black/5 dark:bg-white/5'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <>
            <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {cards.map((c) => (
                <div key={c.label} className="glass rounded-2xl p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm text-[var(--muted)]">{c.label}</span>
                    <c.icon className="h-5 w-5 text-brand-500" />
                  </div>
                  <p className="text-3xl font-bold">{c.value.toLocaleString()}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">{c.sub}</p>
                </div>
              ))}
            </div>

            <div className="glass rounded-2xl p-6">
              <h2 className="mb-4 font-semibold">Messages (last 14 days)</h2>
              <div className="flex h-40 items-end gap-1.5">
                {messageStats.map((s) => (
                  <div key={s.date} className="group relative flex flex-1 flex-col items-center">
                    <div
                      className="w-full rounded-t-md bg-brand-600/80 transition hover:bg-brand-500"
                      style={{ height: `${(s.total / maxMsg) * 100}%`, minHeight: s.total ? 4 : 0 }}
                    />
                    <span className="mt-1 hidden text-[9px] text-[var(--muted)] sm:block">
                      {s.date.slice(5)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="glass rounded-2xl p-4">
                <p className="text-sm text-[var(--muted)]">Active users</p>
                <p className="text-2xl font-bold text-emerald-500">{stats.users.active}</p>
              </div>
              <div className="glass rounded-2xl p-4">
                <p className="text-sm text-[var(--muted)]">Suspended</p>
                <p className="text-2xl font-bold text-amber-500">{stats.users.suspended}</p>
              </div>
              <div className="glass rounded-2xl p-4">
                <p className="text-sm text-[var(--muted)]">Banned</p>
                <p className="text-2xl font-bold text-red-500">{stats.users.banned}</p>
              </div>
            </div>
          </>
        )}

        {tab === 'users' && (
          <div>
            <div className="mb-4 flex gap-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadUsers()}
                placeholder="Search users..."
                className="input-field max-w-sm"
              />
              <Button onClick={loadUsers}>Search</Button>
            </div>
            <div className="space-y-2">
              {users.map((u) => (
                <div key={u.id as string} className="glass flex flex-wrap items-center gap-3 rounded-2xl p-4">
                  <Avatar
                    src={u.avatarUrl as string}
                    name={(u.displayName as string) || 'U'}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{u.displayName as string}</p>
                    <p className="text-xs text-[var(--muted)]">
                      @{u.username as string} · {u.email as string} · {u.role as string} ·{' '}
                      <span
                        className={
                          u.status === 'ACTIVE'
                            ? 'text-emerald-500'
                            : u.status === 'SUSPENDED'
                              ? 'text-amber-500'
                              : 'text-red-500'
                        }
                      >
                        {u.status as string}
                      </span>
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => updateUser(u.id as string, { status: 'SUSPENDED' })}
                  >
                    Suspend
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => updateUser(u.id as string, { status: 'BANNED' })}
                  >
                    <Ban className="h-4 w-4" /> Ban
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => updateUser(u.id as string, { status: 'ACTIVE' })}
                  >
                    Restore
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'reports' && (
          <div className="space-y-2">
            {reports.length === 0 && (
              <p className="py-12 text-center text-[var(--muted)]">No reports</p>
            )}
            {reports.map((r) => {
              const reported = r.reported as { displayName: string; username: string; avatarUrl?: string };
              const reporter = r.reporter as { displayName: string; username: string };
              return (
                <div key={r.id as string} className="glass rounded-2xl p-4">
                  <div className="mb-2 flex items-center gap-3">
                    <Avatar src={reported?.avatarUrl} name={reported?.displayName || 'U'} />
                    <div className="flex-1">
                      <p className="font-medium">
                        {reported?.displayName}{' '}
                        <span className="text-xs text-[var(--muted)]">
                          reported by {reporter?.displayName}
                        </span>
                      </p>
                      <p className="text-sm text-red-400">{r.reason as string}</p>
                      {!!r.description && (
                        <p className="text-xs text-[var(--muted)]">{r.description as string}</p>
                      )}
                    </div>
                    <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs dark:bg-white/5">
                      {r.status as string}
                    </span>
                  </div>
                  {r.status === 'PENDING' && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => updateReport(r.id as string, 'RESOLVED')}>
                        Resolve
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => updateReport(r.id as string, 'DISMISSED')}
                      >
                        Dismiss
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
