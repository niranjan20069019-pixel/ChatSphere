'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  MessageCircle,
  Users,
  UsersRound,
  Search,
  Bell,
  Settings,
  User,
  LogOut,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import { Avatar } from '@/components/ui/Avatar';
import { useChatStore } from '@/store/chatStore';

const navItems = [
  { href: '/dashboard', icon: MessageCircle, label: 'Chats' },
  { href: '/friends', icon: Users, label: 'Friends' },
  { href: '/groups', icon: UsersRound, label: 'Groups' },
  { href: '/search', icon: Search, label: 'Search' },
  { href: '/notifications', icon: Bell, label: 'Notifications' },
  { href: '/settings', icon: Settings, label: 'Settings' },
  { href: '/profile', icon: User, label: 'Profile' },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const conversations = useChatStore((s) => s.conversations);
  const unreadMessages = conversations.reduce((acc, c) => acc + c.unreadCount, 0);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <aside className="hidden w-64 flex-col border-r border-[var(--card-border)] bg-white py-4 lg:flex">
      <div className="mb-6 flex items-center gap-2 px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1a1a1a] text-white">
          <MessageCircle className="h-5 w-5" />
        </div>
        <span className="font-semibold tracking-tight text-lg">ChatSphere</span>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          const badge =
            item.href === '/notifications'
              ? unreadCount
              : item.href === '/dashboard'
                ? unreadMessages
                : 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                active
                  ? 'bg-black/[0.04] text-[#1a1a1a]'
                  : 'text-[var(--muted)] hover:bg-black/[0.02] hover:text-[#1a1a1a]'
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span>{item.label}</span>
              {badge > 0 && (
                <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--accent)] px-1.5 text-[10px] font-bold text-[var(--accent-foreground)]">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </Link>
          );
        })}

        {(user?.role === 'ADMIN' || user?.role === 'MODERATOR') && (
          <Link
            href="/admin"
            className={cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
              pathname.startsWith('/admin')
                ? 'bg-black/[0.04] text-[#1a1a1a]'
                : 'text-[var(--muted)] hover:bg-black/[0.02] hover:text-[#1a1a1a]'
            )}
          >
            <Shield className="h-5 w-5 shrink-0" />
            <span>Admin</span>
          </Link>
        )}
      </nav>

      <div className="mt-auto border-t border-[var(--card-border)] px-3 pt-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <Avatar
            src={user?.avatarUrl}
            name={user?.displayName || 'U'}
            size="sm"
            online
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user?.displayName}</p>
            <p className="truncate text-xs text-[var(--muted)]">@{user?.username}</p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg p-2 text-[var(--muted)] transition hover:bg-red-500/10 hover:text-[var(--danger)]"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
