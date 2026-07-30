'use client';

import { useEffect } from 'react';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { useNotificationStore } from '@/store/notificationStore';
import { notificationsApi } from '@/lib/api';
import { formatLastSeen } from '@/lib/utils';

export default function NotificationsPage() {
  const { notifications, unreadCount, fetch, markRead, markAllRead } = useNotificationStore();

  useEffect(() => {
    fetch();
  }, []);

  const remove = async (id: string) => {
    await notificationsApi.delete(id);
    fetch();
  };

  return (
    <AppShell>
      <div className="mx-auto h-full max-w-2xl overflow-y-auto p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Notifications</h1>
            <p className="text-sm text-[var(--muted)]">{unreadCount} unread</p>
          </div>
          {unreadCount > 0 && (
            <Button size="sm" variant="secondary" onClick={markAllRead}>
              <CheckCheck className="h-4 w-4" /> Mark all read
            </Button>
          )}
        </div>

        <div className="space-y-2">
          {notifications.length === 0 && (
            <div className="flex flex-col items-center py-16 text-[var(--muted)]">
              <Bell className="mb-3 h-10 w-10 opacity-40" />
              <p className="text-sm">No notifications yet</p>
            </div>
          )}
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`glass flex items-start gap-3 rounded-2xl p-4 ${!n.isRead ? 'border-brand-500/30' : ''}`}
            >
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600/15 text-brand-500">
                <Bell className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm">{n.title}</p>
                <p className="text-sm text-[var(--muted)]">{n.body}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">{formatLastSeen(n.createdAt)}</p>
              </div>
              <div className="flex gap-1">
                {!n.isRead && (
                  <Button size="sm" variant="ghost" onClick={() => markRead(n.id)}>
                    <CheckCheck className="h-4 w-4" />
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => remove(n.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
