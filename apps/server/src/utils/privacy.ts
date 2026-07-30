import { OnlineStatus } from '@prisma/client';

type PresenceUser = {
  onlineStatus?: OnlineStatus | null;
  lastSeenAt?: Date | string | null;
  showOnlineStatus?: boolean | null;
  showLastSeen?: boolean | null;
};

export function redactPresence<T extends PresenceUser>(user: T): Omit<T, 'showOnlineStatus' | 'showLastSeen'> {
  const { showOnlineStatus, showLastSeen, ...rest } = user;
  return {
    ...rest,
    onlineStatus: showOnlineStatus === false ? 'OFFLINE' : rest.onlineStatus,
    lastSeenAt: showLastSeen === false ? null : rest.lastSeenAt,
  } as Omit<T, 'showOnlineStatus' | 'showLastSeen'>;
}

export async function canBroadcastPresence(userId: string): Promise<boolean> {
  const { prisma } = await import('../config/database');
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { showOnlineStatus: true },
  });
  return user?.showOnlineStatus !== false;
}
