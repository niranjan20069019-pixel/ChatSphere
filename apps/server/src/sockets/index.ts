import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { z } from 'zod';
import { verifyAccessToken } from '../utils/jwt';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { logger } from '../config/logger';
import {
  assertNotBlocked,
  assertValidDmReply,
  assertValidGroupReply,
  assertForwardAccess,
  assertAllowedFileUrl,
} from '../utils/access';
import { canBroadcastPresence } from '../utils/privacy';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
  sessionId?: string;
}

const onlineUsers = new Map<string, Set<string>>();
const typingThrottle = new Map<string, number>();

function checkTypingThrottle(userId: string): boolean {
  const now = Date.now();
  const last = typingThrottle.get(userId) || 0;
  if (now - last < 3000) return false;
  typingThrottle.set(userId, now);
  return true;
}

const MESSAGE_TYPES = ['TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'VOICE', 'DOCUMENT', 'GIF'] as const;

const dmSendSchema = z.object({
  receiverId: z.string().min(1).max(64),
  content: z.string().max(10000).optional(),
  type: z.enum(MESSAGE_TYPES).optional(),
  fileUrl: z.string().max(2048).optional(),
  fileName: z.string().max(255).optional(),
  fileSize: z.number().int().nonnegative().max(env.MAX_FILE_SIZE).optional(),
  mimeType: z.string().max(128).optional(),
  replyToId: z.string().min(1).max(64).optional(),
  forwardedFromId: z.string().min(1).max(64).optional(),
});

const groupSendSchema = z.object({
  groupId: z.string().min(1).max(64),
  content: z.string().max(10000).optional(),
  type: z.enum(MESSAGE_TYPES).optional(),
  fileUrl: z.string().max(2048).optional(),
  fileName: z.string().max(255).optional(),
  fileSize: z.number().int().nonnegative().max(env.MAX_FILE_SIZE).optional(),
  mimeType: z.string().max(128).optional(),
  replyToId: z.string().min(1).max(64).optional(),
});

export const getOnlineUserIds = (): string[] => Array.from(onlineUsers.keys());

export const isUserOnline = (userId: string): boolean => onlineUsers.has(userId);

export const emitToUser = (io: Server, userId: string, event: string, data: unknown) => {
  const sockets = onlineUsers.get(userId);
  if (sockets) {
    sockets.forEach((socketId) => io.to(socketId).emit(event, data));
  }
};

function parseCookieToken(cookieHeader?: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:^|;\s*)accessToken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function requireGroupMember(groupId: string, userId: string) {
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
    include: { group: { select: { id: true, isDeleted: true } } },
  });
  if (!membership || membership.group.isDeleted) return null;
  return membership;
}

export const setupSocketIO = (httpServer: HttpServer): Server => {
  const io = new Server(httpServer, {
    cors: {
      origin: env.corsOrigins,
      credentials: true,
    },
    pingTimeout: 60000,
  });

  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token =
        (typeof socket.handshake.auth?.token === 'string' && socket.handshake.auth.token) ||
        socket.handshake.headers.authorization?.replace(/^Bearer\s+/i, '') ||
        parseCookieToken(socket.handshake.headers.cookie);

      if (!token) return next(new Error('Authentication required'));

      const payload = verifyAccessToken(token);

      if (payload.sessionId) {
        const session = await prisma.session.findUnique({
          where: { id: payload.sessionId },
          select: { id: true, userId: true, expiresAt: true },
        });
        if (
          !session ||
          session.userId !== payload.userId ||
          session.expiresAt < new Date()
        ) {
          return next(new Error('Session expired'));
        }
        socket.sessionId = session.id;
      }

      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, username: true, status: true },
      });

      if (!user || user.status !== 'ACTIVE') return next(new Error('Unauthorized'));

      socket.userId = user.id;
      socket.username = user.username;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket: AuthenticatedSocket) => {
    const userId = socket.userId!;
    logger.info(`Socket connected: ${socket.username} (${socket.id})`);

    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
      await prisma.user.update({
        where: { id: userId },
        data: { onlineStatus: 'ONLINE', lastSeenAt: new Date() },
      });
      if (await canBroadcastPresence(userId)) {
        socket.broadcast.emit('user:online', { userId });
      }
    }
    onlineUsers.get(userId)!.add(socket.id);

    socket.join(`user:${userId}`);

    const memberships = await prisma.groupMember.findMany({
      where: { userId, group: { isDeleted: false } },
      select: { groupId: true },
    });
    memberships.forEach((m) => socket.join(`group:${m.groupId}`));

    // Only expose presence for users who allow it
    const visibleOnline = [];
    for (const id of getOnlineUserIds()) {
      if (await canBroadcastPresence(id)) visibleOnline.push(id);
    }
    socket.emit('presence:list', { onlineUserIds: visibleOnline });

    socket.on('message:send', async (data, ack) => {
      try {
        const parsed = dmSendSchema.parse(data);
        if (!parsed.content && !parsed.fileUrl) {
          if (typeof ack === 'function') ack({ success: false, error: 'Empty message' });
          return;
        }
        assertAllowedFileUrl(parsed.fileUrl);
        await assertNotBlocked(userId, parsed.receiverId);

        const receiver = await prisma.user.findUnique({
          where: { id: parsed.receiverId },
          select: { id: true, status: true },
        });
        if (!receiver || receiver.status !== 'ACTIVE') {
          if (typeof ack === 'function') ack({ success: false, error: 'User not found' });
          return;
        }

        await assertValidDmReply(parsed.replyToId, userId, parsed.receiverId);
        await assertForwardAccess(parsed.forwardedFromId, userId);

        const message = await prisma.message.create({
          data: {
            senderId: userId,
            receiverId: parsed.receiverId,
            content: parsed.content,
            type: parsed.type || 'TEXT',
            fileUrl: parsed.fileUrl,
            fileName: parsed.fileName,
            fileSize: parsed.fileSize,
            mimeType: parsed.mimeType,
            replyToId: parsed.replyToId,
            forwardedFromId: parsed.forwardedFromId,
            deliveredAt: isUserOnline(parsed.receiverId) ? new Date() : null,
          },
          include: {
            sender: {
              select: { id: true, username: true, displayName: true, avatarUrl: true },
            },
            replyTo: {
              select: {
                id: true,
                content: true,
                sender: { select: { id: true, displayName: true } },
              },
            },
            reactions: true,
          },
        });

        emitToUser(io, parsed.receiverId, 'message:new', { message });
        emitToUser(io, userId, 'message:sent', { message });

        if (typeof ack === 'function') ack({ success: true, message });
      } catch (err) {
        logger.error(`message:send error: ${err}`);
        if (typeof ack === 'function') ack({ success: false, error: 'Failed to send' });
      }
    });

    socket.on('message:delivered', async ({ messageId }) => {
      if (typeof messageId !== 'string') return;
      const result = await prisma.message.updateMany({
        where: { id: messageId, receiverId: userId, deliveredAt: null },
        data: { deliveredAt: new Date() },
      });
      if (result.count === 0) return;
      const message = await prisma.message.findUnique({
        where: { id: messageId },
        select: { senderId: true, deliveredAt: true },
      });
      if (message) {
        emitToUser(io, message.senderId, 'message:status', {
          messageId,
          deliveredAt: message.deliveredAt,
        });
      }
    });

    socket.on('message:read', async ({ messageIds, senderId }) => {
      if (!Array.isArray(messageIds) || typeof senderId !== 'string') return;
      const ids = messageIds.filter((id): id is string => typeof id === 'string').slice(0, 100);
      await prisma.message.updateMany({
        where: {
          id: { in: ids },
          receiverId: userId,
          senderId,
          readAt: null,
        },
        data: { readAt: new Date() },
      });
      emitToUser(io, senderId, 'message:status', {
        messageIds: ids,
        readAt: new Date(),
      });
    });

    socket.on('message:edit', async ({ messageId, content }, ack) => {
      try {
        if (typeof messageId !== 'string' || typeof content !== 'string' || content.length > 10000) {
          if (typeof ack === 'function') ack({ success: false });
          return;
        }
        const existing = await prisma.message.findFirst({
          where: { id: messageId, senderId: userId, isDeleted: false, deletedForAll: false },
        });
        if (!existing) {
          if (typeof ack === 'function') ack({ success: false });
          return;
        }

        const message = await prisma.message.update({
          where: { id: messageId },
          data: { content, isEdited: true },
          include: {
            sender: {
              select: { id: true, username: true, displayName: true, avatarUrl: true },
            },
            reactions: true,
          },
        });
        emitToUser(io, message.receiverId, 'message:edited', { message });
        if (typeof ack === 'function') ack({ success: true, message });
      } catch {
        if (typeof ack === 'function') ack({ success: false });
      }
    });

    socket.on('message:delete', async ({ messageId, forEveryone }) => {
      if (typeof messageId !== 'string') return;
      const message = await prisma.message.findUnique({ where: { id: messageId } });
      if (!message || message.senderId !== userId) return;

      if (forEveryone) {
        await prisma.message.update({
          where: { id: messageId },
          data: { isDeleted: true, deletedForAll: true, content: null, fileUrl: null },
        });
        emitToUser(io, message.receiverId, 'message:deleted', { messageId, forEveryone: true });
      }
    });

    socket.on('message:react', async ({ messageId, emoji }) => {
      if (typeof messageId !== 'string' || typeof emoji !== 'string' || emoji.length > 16) return;
      const message = await prisma.message.findUnique({ where: { id: messageId } });
      if (!message) return;
      if (message.senderId !== userId && message.receiverId !== userId) return;

      const existing = await prisma.messageReaction.findUnique({
        where: {
          messageId_userId_emoji: { messageId, userId, emoji },
        },
      });

      if (existing) {
        await prisma.messageReaction.delete({ where: { id: existing.id } });
      } else {
        await prisma.messageReaction.create({
          data: { messageId, userId, emoji },
        });
      }

      const reactions = await prisma.messageReaction.findMany({
        where: { messageId },
        include: {
          user: { select: { id: true, username: true, displayName: true } },
        },
      });

      const peerId = message.senderId === userId ? message.receiverId : message.senderId;
      emitToUser(io, peerId, 'message:reaction', { messageId, reactions });
      emitToUser(io, userId, 'message:reaction', { messageId, reactions });
    });

    socket.on('typing:start', async ({ receiverId }) => {
      if (typeof receiverId !== 'string' || receiverId === userId) return;
      if (!checkTypingThrottle(`start:${userId}`)) return;
      try {
        await assertNotBlocked(userId, receiverId);
        emitToUser(io, receiverId, 'typing:start', { userId });
      } catch {
        // ignore
      }
    });

    socket.on('typing:stop', async ({ receiverId }) => {
      if (typeof receiverId !== 'string' || receiverId === userId) return;
      if (!checkTypingThrottle(`stop:${userId}`)) return;
      try {
        await assertNotBlocked(userId, receiverId);
        emitToUser(io, receiverId, 'typing:stop', { userId });
      } catch {
        // ignore
      }
    });

    socket.on('group:message', async (data, ack) => {
      try {
        const parsed = groupSendSchema.parse(data);
        if (!parsed.content && !parsed.fileUrl) {
          if (typeof ack === 'function') ack({ success: false, error: 'Empty message' });
          return;
        }
        assertAllowedFileUrl(parsed.fileUrl);

        const membership = await requireGroupMember(parsed.groupId, userId);
        if (!membership) {
          if (typeof ack === 'function') ack({ success: false, error: 'Not a member' });
          return;
        }

        await assertValidGroupReply(parsed.replyToId, parsed.groupId);

        const message = await prisma.groupMessage.create({
          data: {
            groupId: parsed.groupId,
            senderId: userId,
            content: parsed.content,
            type: parsed.type || 'TEXT',
            fileUrl: parsed.fileUrl,
            fileName: parsed.fileName,
            fileSize: parsed.fileSize,
            mimeType: parsed.mimeType,
            replyToId: parsed.replyToId,
          },
          include: {
            sender: {
              select: { id: true, username: true, displayName: true, avatarUrl: true },
            },
          },
        });

        io.to(`group:${parsed.groupId}`).emit('group:message', { message });
        if (typeof ack === 'function') ack({ success: true, message });
      } catch (err) {
        logger.error(`group:message error: ${err}`);
        if (typeof ack === 'function') ack({ success: false });
      }
    });

    socket.on('group:typing', async ({ groupId }) => {
      if (typeof groupId !== 'string') return;
      if (!checkTypingThrottle(`group:${userId}`)) return;
      const membership = await requireGroupMember(groupId, userId);
      if (!membership) return;
      socket.to(`group:${groupId}`).emit('group:typing', {
        groupId,
        userId,
        username: socket.username,
      });
    });

    socket.on('group:join', async ({ groupId }, ack) => {
      if (typeof groupId !== 'string') {
        if (typeof ack === 'function') ack({ success: false });
        return;
      }
      const membership = await requireGroupMember(groupId, userId);
      if (!membership) {
        if (typeof ack === 'function') ack({ success: false, error: 'Forbidden' });
        return;
      }
      socket.join(`group:${groupId}`);
      if (typeof ack === 'function') ack({ success: true });
    });

    socket.on('call:initiate', async ({ calleeId, type, offer }) => {
      if (typeof calleeId !== 'string' || calleeId === userId) return;
      if (type !== 'VOICE' && type !== 'VIDEO') return;
      try {
        await assertNotBlocked(userId, calleeId);
      } catch {
        return;
      }

      const callee = await prisma.user.findUnique({
        where: { id: calleeId },
        select: { id: true, status: true },
      });
      if (!callee || callee.status !== 'ACTIVE') return;

      const call = await prisma.call.create({
        data: {
          callerId: userId,
          calleeId,
          type,
          status: 'RINGING',
        },
      });

      const caller = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      });

      emitToUser(io, calleeId, 'call:incoming', {
        callId: call.id,
        caller,
        type,
        offer,
      });

      await prisma.notification.create({
        data: {
          userId: calleeId,
          type: 'CALL',
          title: `Incoming ${type.toLowerCase()} call`,
          body: `${caller?.displayName} is calling you`,
          data: { callId: call.id, fromUserId: userId },
        },
      });
    });

    socket.on('call:answer', async ({ callId, answer }) => {
      if (typeof callId !== 'string') return;
      const call = await prisma.call.findUnique({ where: { id: callId } });
      if (!call || call.calleeId !== userId || call.status !== 'RINGING') return;

      await prisma.call.update({
        where: { id: callId },
        data: { status: 'ACTIVE', startedAt: new Date() },
      });
      emitToUser(io, call.callerId, 'call:answered', { callId, answer });
    });

    socket.on('call:reject', async ({ callId }) => {
      if (typeof callId !== 'string') return;
      const call = await prisma.call.findUnique({ where: { id: callId } });
      if (!call || call.calleeId !== userId || call.status !== 'RINGING') return;

      await prisma.call.update({
        where: { id: callId },
        data: { status: 'REJECTED', endedAt: new Date() },
      });
      emitToUser(io, call.callerId, 'call:rejected', { callId });
    });

    socket.on('call:end', async ({ callId }) => {
      if (typeof callId !== 'string') return;
      const call = await prisma.call.findUnique({ where: { id: callId } });
      if (!call) return;
      if (call.callerId !== userId && call.calleeId !== userId) return;
      if (call.status === 'ENDED' || call.status === 'REJECTED') return;

      await prisma.call.update({
        where: { id: callId },
        data: { status: 'ENDED', endedAt: new Date() },
      });
      const peerId = call.callerId === userId ? call.calleeId : call.callerId;
      emitToUser(io, peerId, 'call:ended', { callId });
    });

    socket.on('call:ice-candidate', async ({ callId, peerId, candidate }) => {
      if (typeof callId !== 'string' || !candidate) return;
      const call = await prisma.call.findUnique({ where: { id: callId } });
      if (!call) return;
      if (call.callerId !== userId && call.calleeId !== userId) return;
      const otherId = call.callerId === userId ? call.calleeId : call.callerId;
      // Ignore spoofed peerId; always use the other party from DB
      if (typeof peerId === 'string' && peerId !== otherId) return;
      emitToUser(io, otherId, 'call:ice-candidate', { candidate, fromUserId: userId, callId });
    });

    socket.on('disconnect', async () => {
      const sockets = onlineUsers.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          onlineUsers.delete(userId);
          await prisma.user.update({
            where: { id: userId },
            data: { onlineStatus: 'OFFLINE', lastSeenAt: new Date() },
          });
          if (await canBroadcastPresence(userId)) {
            socket.broadcast.emit('user:offline', { userId, lastSeenAt: new Date() });
          }
        }
      }
      logger.info(`Socket disconnected: ${socket.username} (${socket.id})`);
    });
  });

  return io;
};
