'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageCircle, Users, Bell, User, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotificationStore } from '@/store/notificationStore';
import { useChatStore } from '@/store/chatStore';

const navItems = [
  { href: '/dashboard', icon: MessageCircle, label: 'Chats' },
  { href: '/friends', icon: Users, label: 'Friends' },
  { href: '/search', icon: Search, label: 'Search' },
  { href: '/notifications', icon: Bell, label: 'Alerts' },
  { href: '/profile', icon: User, label: 'Profile' },
];

export function BottomNavigation() {
  const pathname = usePathname();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const conversations = useChatStore((s) => s.conversations);
  const unreadMessages = conversations.reduce((acc, c) => acc + c.unreadCount, 0);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--card-border)] bg-[var(--nav-bg)] backdrop-blur-xl lg:hidden">
      <div className="mx-auto flex max-w-lg items-center justify-around py-1">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          let badge = 0;
          if (item.href === '/notifications') badge = unreadCount;
          else if (item.href === '/dashboard') badge = unreadMessages;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'bottom-nav-btn relative',
                active ? 'text-[#1a1a1a]' : 'text-[var(--muted)]'
              )}
            >
              <div className="relative">
                <Icon className="h-6 w-6" />
                {badge > 0 && (
                  <span className="absolute -right-1.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[9px] font-bold text-[var(--accent-foreground)]">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </div>
              <span className={cn('text-[10px]', active ? 'font-semibold' : '')}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
