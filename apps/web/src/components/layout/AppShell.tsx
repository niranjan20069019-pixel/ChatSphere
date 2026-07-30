'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Sidebar } from './Sidebar';
import { BottomNavigation } from './BottomNavigation';
import { SocketProvider } from '@/components/providers/SocketProvider';
import { CallOverlay } from '@/components/call/CallOverlay';
import { Loader2 } from 'lucide-react';

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading, initialize } = useAuthStore();
  const [init, setInit] = useState(false);

  useEffect(() => {
    initialize().then(() => setInit(true));
  }, []);

  useEffect(() => {
    if (init && !isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [init, isLoading, isAuthenticated, router]);

  if (isLoading || !init) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--background)]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#1a1a1a]" />
          <p className="text-sm text-[var(--muted)]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <SocketProvider>
      <div className="flex h-screen overflow-hidden bg-[var(--background)]">
        <Sidebar />
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden pb-[62px] lg:pb-0">
          {children}
        </main>
        <BottomNavigation />
        <CallOverlay />
      </div>
    </SocketProvider>
  );
}
