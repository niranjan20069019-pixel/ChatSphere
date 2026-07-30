'use client';

import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { connectSocket } from '@/lib/socket';
import { useChatStore } from '@/store/chatStore';
import { useCallStore } from '@/store/callStore';
import { useAuthStore } from '@/store/authStore';
import { Message, User } from '@/types';

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const {
    addMessage,
    updateMessage,
    setTyping,
    setOnlineUsers,
    setUserOnline,
    activePeer,
    updateUnread,
  } = useChatStore();
  const receiveCall = useCallStore((s) => s.receiveCall);

  useEffect(() => {
    if (!user) return;

    const socket = connectSocket();

    socket.on('connect', () => {
      console.log('Socket connected');
    });

    socket.on('presence:list', ({ onlineUserIds }: { onlineUserIds: string[] }) => {
      setOnlineUsers(onlineUserIds);
    });

    socket.on('user:online', ({ userId }: { userId: string }) => {
      setUserOnline(userId, true);
    });

    socket.on('user:offline', ({ userId }: { userId: string }) => {
      setUserOnline(userId, false);
    });

    socket.on('message:new', ({ message }: { message: Message }) => {
      addMessage(message);
      if (activePeer?.id === message.senderId) {
        socket.emit('message:read', {
          messageIds: [message.id],
          senderId: message.senderId,
        });
        updateUnread(message.senderId, 0);
      } else {
        toast(`${message.sender?.displayName || 'New message'}: ${message.content?.slice(0, 50) || 'Media'}`, {
          icon: '💬',
        });
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification(message.sender?.displayName || 'ChatSphere', {
            body: message.content?.slice(0, 100) || 'Sent a media file',
            icon: message.sender?.avatarUrl || undefined,
          });
        }
      }
    });

    socket.on('message:sent', ({ message }: { message: Message }) => {
      addMessage(message);
    });

    socket.on(
      'message:status',
      (data: { messageId?: string; messageIds?: string[]; deliveredAt?: string; readAt?: string }) => {
        if (data.messageId) {
          updateMessage(data.messageId, {
            deliveredAt: data.deliveredAt,
            readAt: data.readAt,
          });
        }
        if (data.messageIds && data.readAt) {
          data.messageIds.forEach((id) => updateMessage(id, { readAt: data.readAt }));
        }
      }
    );

    socket.on('message:edited', ({ message }: { message: Message }) => {
      updateMessage(message.id, message);
    });

    socket.on('message:deleted', ({ messageId }: { messageId: string }) => {
      updateMessage(messageId, {
        isDeleted: true,
        deletedForAll: true,
        content: null,
      });
    });

    socket.on(
      'message:reaction',
      ({ messageId, reactions }: { messageId: string; reactions: Message['reactions'] }) => {
        updateMessage(messageId, { reactions });
      }
    );

    socket.on('typing:start', ({ userId }: { userId: string }) => {
      setTyping(userId, true);
    });

    socket.on('typing:stop', ({ userId }: { userId: string }) => {
      setTyping(userId, false);
    });

    socket.on(
      'call:incoming',
      (data: { callId: string; caller: User; type: 'VOICE' | 'VIDEO'; offer: RTCSessionDescriptionInit }) => {
        receiveCall(data);
        toast(`Incoming ${data.type.toLowerCase()} call from ${data.caller.displayName}`, {
          icon: '📞',
          duration: 10000,
        });
      }
    );

    return () => {
      socket.off('presence:list');
      socket.off('user:online');
      socket.off('user:offline');
      socket.off('message:new');
      socket.off('message:sent');
      socket.off('message:status');
      socket.off('message:edited');
      socket.off('message:deleted');
      socket.off('message:reaction');
      socket.off('typing:start');
      socket.off('typing:stop');
      socket.off('call:incoming');
    };
  }, [user?.id]);

  useEffect(() => {
    if (typeof window !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return <>{children}</>;
}
