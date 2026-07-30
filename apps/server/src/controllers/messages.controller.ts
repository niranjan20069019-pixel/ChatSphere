import { Response } from 'express';
import { prisma } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { AppError, asyncHandler } from '../utils/errors';
import { param } from '../utils/params';
import {
  assertNotBlocked,
  assertValidDmReply,
  assertForwardAccess,
  assertAllowedFileUrl,
  assertDmParticipant,
} from '../utils/access';
import { redactPresence } from '../utils/privacy';

const messageInclude = {
  sender: {
    select: { id: true, username: true, displayName: true, avatarUrl: true },
  },
  receiver: {
    select: { id: true, username: true, displayName: true, avatarUrl: true },
  },
  replyTo: {
    select: {
      id: true,
      content: true,
      type: true,
      sender: { select: { id: true, displayName: true } },
    },
  },
  reactions: {
    include: {
      user: { select: { id: true, username: true, displayName: true } },
    },
  },
} as const;

export const sendMessage = asyncHandler(async (req: AuthRequest, res: Response) => {
  const me = req.user!.userId;
  const {
    receiverId,
    content,
    type = 'TEXT',
    fileUrl,
    fileName,
    fileSize,
    mimeType,
    replyToId,
    forwardedFromId,
  } = req.body;

  if (!content && !fileUrl) throw new AppError('Message content or file required', 400);
  assertAllowedFileUrl(fileUrl);
  await assertNotBlocked(me, receiverId);
  await assertValidDmReply(replyToId, me, receiverId);
  await assertForwardAccess(forwardedFromId, me);

  const receiver = await prisma.user.findUnique({ where: { id: receiverId } });
  if (!receiver || receiver.status !== 'ACTIVE') throw new AppError('User not found', 404);

  const message = await prisma.message.create({
    data: {
      senderId: me,
      receiverId,
      content,
      type,
      fileUrl,
      fileName,
      fileSize,
      mimeType,
      replyToId,
      forwardedFromId,
    },
    include: messageInclude,
  });

  const chatSetting = await prisma.chatSetting.findUnique({
    where: { userId_peerId: { userId: receiverId, peerId: me } },
  });

  if (!chatSetting?.isMuted && receiver.notifyMessages) {
    await prisma.notification.create({
      data: {
        userId: receiverId,
        type: 'MESSAGE',
        title: message.sender.displayName,
        body: content?.slice(0, 100) || `Sent a ${type.toLowerCase()}`,
        data: { messageId: message.id, fromUserId: me },
      },
    });
  }

  res.status(201).json({ success: true, data: { message } });
});

export const getConversations = asyncHandler(async (req: AuthRequest, res: Response) => {
  const me = req.user!.userId;
  const archived = req.query.archived === 'true';

  const settings = await prisma.chatSetting.findMany({ where: { userId: me } });
  const settingsMap = new Map(settings.map((s) => [s.peerId, s]));
  const archivedPeerIds = new Set(
    settings.filter((s) => s.isArchived).map((s) => s.peerId)
  );

  const peerIdsFromMessages = await prisma.message.groupBy({
    by: ['senderId', 'receiverId'],
    where: {
      OR: [{ senderId: me }, { receiverId: me }],
      AND: [
        { NOT: { AND: [{ senderId: me }, { deletedBySender: true }] } },
        { NOT: { AND: [{ receiverId: me }, { deletedByReceiver: true }] } },
      ],
    },
    _max: { createdAt: true },
  });

  const peerSet = new Set<string>();
  for (const row of peerIdsFromMessages) {
    const peerId = row.senderId === me ? row.receiverId : row.senderId;
    if (archived ? archivedPeerIds.has(peerId) : !archivedPeerIds.has(peerId)) {
      peerSet.add(peerId);
    }
  }

  const peerIds = Array.from(peerSet);
  if (peerIds.length === 0) {
    return res.json({ success: true, data: { conversations: [] } });
  }

  const lastMessages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: me, receiverId: { in: peerIds } },
        { senderId: { in: peerIds }, receiverId: me },
      ],
      AND: [
        { NOT: { AND: [{ senderId: me }, { deletedBySender: true }] } },
        { NOT: { AND: [{ receiverId: me }, { deletedByReceiver: true }] } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    distinct: ['receiverId', 'senderId'],
    include: {
      sender: {
        select: { id: true, username: true, displayName: true, avatarUrl: true, onlineStatus: true, lastSeenAt: true, showOnlineStatus: true, showLastSeen: true },
      },
      receiver: {
        select: { id: true, username: true, displayName: true, avatarUrl: true, onlineStatus: true, lastSeenAt: true, showOnlineStatus: true, showLastSeen: true },
      },
    },
  });

  const chatMap = new Map<string, (typeof lastMessages)[0]>();
  for (const msg of lastMessages) {
    const peerId = msg.senderId === me ? msg.receiverId : msg.senderId;
    if (!chatMap.has(peerId)) chatMap.set(peerId, msg);
  }

  let conversations = Array.from(chatMap.entries()).map(([peerId, lastMessage]) => {
    const rawPeer = lastMessage.senderId === me ? lastMessage.receiver : lastMessage.sender;
    const peer = {
      id: rawPeer.id,
      username: rawPeer.username,
      displayName: rawPeer.displayName,
      avatarUrl: rawPeer.avatarUrl,
      onlineStatus: rawPeer.showOnlineStatus === false ? 'OFFLINE' as const : rawPeer.onlineStatus,
      lastSeenAt: rawPeer.showLastSeen === false ? null : rawPeer.lastSeenAt,
    };
    const setting = settingsMap.get(peerId);
    return {
      peer,
      lastMessage,
      isMuted: setting?.isMuted ?? false,
      isArchived: setting?.isArchived ?? false,
      isPinned: setting?.isPinned ?? false,
      wallpaper: setting?.wallpaper,
    };
  });
  conversations.sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return (
      new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime()
    );
  });

  // Unread counts
  const unreadCounts = await prisma.message.groupBy({
    by: ['senderId'],
    where: { receiverId: me, readAt: null, isDeleted: false },
    _count: true,
  });
  const unreadMap = new Map(unreadCounts.map((u) => [u.senderId, u._count]));

  const result = conversations.map((c) => ({
    ...c,
    unreadCount: unreadMap.get(c.peer.id) || 0,
  }));

  res.json({ success: true, data: { conversations: result } });
});

export const getMessages = asyncHandler(async (req: AuthRequest, res: Response) => {
  const me = req.user!.userId;
  const userId = param(req.params.userId);
  const cursor = req.query.cursor as string | undefined;
  const limit = Math.min(parseInt((req.query.limit as string) || '50', 10), 100);

  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: me, receiverId: userId },
        { senderId: userId, receiverId: me },
      ],
      AND: [
        { NOT: { AND: [{ senderId: me }, { deletedBySender: true }] } },
        { NOT: { AND: [{ receiverId: me }, { deletedByReceiver: true }] } },
        { deletedForAll: false },
      ],
    },
    include: messageInclude,
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = messages.length > limit;
  const items = hasMore ? messages.slice(0, limit) : messages;

  // Mark as delivered/read
  await prisma.message.updateMany({
    where: {
      senderId: userId,
      receiverId: me,
      deliveredAt: null,
    },
    data: { deliveredAt: new Date() },
  });

  await prisma.message.updateMany({
    where: {
      senderId: userId,
      receiverId: me,
      readAt: null,
    },
    data: { readAt: new Date() },
  });

  res.json({
    success: true,
    data: {
      messages: items.reverse(),
      nextCursor: hasMore ? items[items.length - 1]?.id : null,
      hasMore,
    },
  });
});

export const editMessage = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = param(req.params.id);
  const { content } = req.body;
  const message = await prisma.message.findUnique({ where: { id } });
  if (!message || message.senderId !== req.user!.userId) {
    throw new AppError('Message not found', 404);
  }
  if (message.isDeleted) throw new AppError('Cannot edit deleted message', 400);

  const updated = await prisma.message.update({
    where: { id },
    data: { content, isEdited: true },
    include: messageInclude,
  });

  res.json({ success: true, data: { message: updated } });
});

export const deleteMessage = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = param(req.params.id);
  const forEveryone = req.query.forEveryone === 'true';
  const me = req.user!.userId;

  const message = await prisma.message.findUnique({ where: { id } });
  if (!message) throw new AppError('Message not found', 404);
  if (message.senderId !== me && message.receiverId !== me) {
    throw new AppError('Forbidden', 403);
  }

  if (forEveryone) {
    if (message.senderId !== me) throw new AppError('Only sender can delete for everyone', 403);
    await prisma.message.update({
      where: { id },
      data: { isDeleted: true, deletedForAll: true, content: null, fileUrl: null },
    });
  } else if (message.senderId === me) {
    await prisma.message.update({ where: { id }, data: { deletedBySender: true } });
  } else {
    await prisma.message.update({ where: { id }, data: { deletedByReceiver: true } });
  }

  res.json({ success: true, message: 'Message deleted' });
});

export const reactToMessage = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = param(req.params.id);
  const { emoji } = req.body;
  const me = req.user!.userId;

  if (typeof emoji !== 'string' || emoji.length < 1 || emoji.length > 16) {
    throw new AppError('Invalid emoji', 400);
  }

  await assertDmParticipant(id, me);

  const existing = await prisma.messageReaction.findUnique({
    where: { messageId_userId_emoji: { messageId: id, userId: me, emoji } },
  });

  if (existing) {
    await prisma.messageReaction.delete({ where: { id: existing.id } });
    const reactions = await prisma.messageReaction.findMany({
      where: { messageId: id },
      include: { user: { select: { id: true, username: true, displayName: true } } },
    });
    return res.json({ success: true, data: { reactions, removed: true } });
  }

  await prisma.messageReaction.create({
    data: { messageId: id, userId: me, emoji },
  });

  const reactions = await prisma.messageReaction.findMany({
    where: { messageId: id },
    include: { user: { select: { id: true, username: true, displayName: true } } },
  });

  res.json({ success: true, data: { reactions, removed: false } });
});

export const starMessage = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = param(req.params.id);
  const me = req.user!.userId;

  await assertDmParticipant(id, me);

  const existing = await prisma.starredMessage.findUnique({
    where: { messageId_userId: { messageId: id, userId: me } },
  });

  if (existing) {
    await prisma.starredMessage.delete({ where: { id: existing.id } });
    return res.json({ success: true, data: { starred: false } });
  }

  await prisma.starredMessage.create({ data: { messageId: id, userId: me } });
  res.json({ success: true, data: { starred: true } });
});

export const pinMessage = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = param(req.params.id);
  const me = req.user!.userId;

  await assertDmParticipant(id, me);

  const existing = await prisma.pinnedMessage.findUnique({
    where: { messageId_userId: { messageId: id, userId: me } },
  });

  if (existing) {
    await prisma.pinnedMessage.delete({ where: { id: existing.id } });
    return res.json({ success: true, data: { pinned: false } });
  }

  await prisma.pinnedMessage.create({ data: { messageId: id, userId: me } });
  res.json({ success: true, data: { pinned: true } });
});

export const searchMessages = asyncHandler(async (req: AuthRequest, res: Response) => {
  const me = req.user!.userId;
  const q = (req.query.q as string) || '';
  const peerId = req.query.peerId as string | undefined;
  const page = parseInt((req.query.page as string) || '1', 10);
  const limit = Math.min(parseInt((req.query.limit as string) || '20', 10), 50);

  if (!q) return res.json({ success: true, data: { messages: [], total: 0 } });

  const where = {
    content: { contains: q, mode: 'insensitive' as const },
    isDeleted: false,
    deletedForAll: false,
    OR: peerId
      ? [
          { senderId: me, receiverId: peerId },
          { senderId: peerId, receiverId: me },
        ]
      : [{ senderId: me }, { receiverId: me }],
  };

  const [messages, total] = await Promise.all([
    prisma.message.findMany({
      where,
      include: messageInclude,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.message.count({ where }),
  ]);

  res.json({ success: true, data: { messages, total, page, limit } });
});

export const updateChatSetting = asyncHandler(async (req: AuthRequest, res: Response) => {
  const peerId = param(req.params.peerId);
  const { isMuted, isArchived, isPinned, wallpaper } = req.body;

  const setting = await prisma.chatSetting.upsert({
    where: { userId_peerId: { userId: req.user!.userId, peerId } },
    create: {
      userId: req.user!.userId,
      peerId,
      isMuted: isMuted ?? false,
      isArchived: isArchived ?? false,
      isPinned: isPinned ?? false,
      wallpaper,
    },
    update: {
      ...(isMuted !== undefined && { isMuted }),
      ...(isArchived !== undefined && { isArchived }),
      ...(isPinned !== undefined && { isPinned }),
      ...(wallpaper !== undefined && { wallpaper }),
    },
  });

  res.json({ success: true, data: { setting } });
});

export const getStarredMessages = asyncHandler(async (req: AuthRequest, res: Response) => {
  const starred = await prisma.starredMessage.findMany({
    where: { userId: req.user!.userId },
    include: { message: { include: messageInclude } },
    orderBy: { createdAt: 'desc' },
  });
  res.json({
    success: true,
    data: { messages: starred.map((s) => s.message) },
  });
});
