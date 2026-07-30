import { Response } from 'express';
import { GroupRole } from '@prisma/client';
import { prisma } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { AppError, asyncHandler } from '../utils/errors';
import { uploadToCloudinary } from '../utils/upload';
import { param } from '../utils/params';
import { assertAllowedFileUrl, assertValidGroupReply } from '../utils/access';

const memberInclude = {
  user: {
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      onlineStatus: true,
    },
  },
} as const;

async function getMembership(groupId: string, userId: string) {
  return prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
    include: { group: { select: { isDeleted: true } } },
  });
}

async function requireMember(groupId: string, userId: string) {
  const membership = await getMembership(groupId, userId);
  if (!membership || membership.group.isDeleted) throw new AppError('Not a group member', 403);
  return membership;
}

async function requireAdmin(groupId: string, userId: string) {
  const membership = await requireMember(groupId, userId);
  if (membership.role === 'MEMBER') throw new AppError('Admin permission required', 403);
  return membership;
}

export const createGroup = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, description, memberIds = [] } = req.body;
  const me = req.user!.userId;

  const group = await prisma.group.create({
    data: {
      name,
      description,
      ownerId: me,
      members: {
        create: [
          { userId: me, role: 'OWNER' },
          ...memberIds
            .filter((id: string) => id !== me)
            .map((id: string) => ({ userId: id, role: 'MEMBER' as GroupRole })),
        ],
      },
    },
    include: { members: { include: memberInclude } },
  });

  for (const memberId of memberIds.filter((id: string) => id !== me)) {
    await prisma.notification.create({
      data: {
        userId: memberId,
        type: 'GROUP_INVITE',
        title: 'Added to group',
        body: `You were added to ${name}`,
        data: { groupId: group.id },
      },
    });
  }

  res.status(201).json({ success: true, data: { group } });
});

export const getGroups = asyncHandler(async (req: AuthRequest, res: Response) => {
  const memberships = await prisma.groupMember.findMany({
    where: { userId: req.user!.userId, group: { isDeleted: false } },
    include: {
      group: {
        include: {
          members: { include: memberInclude },
          _count: { select: { members: true } },
        },
      },
    },
    orderBy: { joinedAt: 'desc' },
  });

  const groupIds = memberships.map((m) => m.groupId);
  const lastMessages = groupIds.length > 0
    ? await prisma.groupMessage.findMany({
        where: { groupId: { in: groupIds }, isDeleted: false },
        orderBy: { createdAt: 'desc' },
        distinct: ['groupId'],
        include: {
          sender: { select: { id: true, displayName: true } },
        },
      })
    : [];
  const lastMessageMap = new Map(lastMessages.map((m) => [m.groupId, m]));

  const groups = memberships.map((m) => ({
    ...m.group,
    myRole: m.role,
    isMuted: m.isMuted,
    lastMessage: lastMessageMap.get(m.groupId) || null,
  }));

  res.json({ success: true, data: { groups } });
});

export const getGroup = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = param(req.params.id);
  await requireMember(id, req.user!.userId);

  const group = await prisma.group.findFirst({
    where: { id, isDeleted: false },
    include: {
      members: { include: memberInclude },
      owner: {
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      },
    },
  });
  if (!group) throw new AppError('Group not found', 404);

  res.json({ success: true, data: { group } });
});

export const updateGroup = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = param(req.params.id);
  await requireAdmin(id, req.user!.userId);

  const { name, description } = req.body;
  const group = await prisma.group.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(description !== undefined && { description }),
    },
    include: { members: { include: memberInclude } },
  });

  res.json({ success: true, data: { group } });
});

export const uploadGroupAvatar = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = param(req.params.id);
  await requireAdmin(id, req.user!.userId);
  if (!req.file) throw new AppError('No file provided', 400);

  req.file.originalname = req.file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 100);

  const result = await uploadToCloudinary(req.file.buffer, 'groups', 'image', req.file.mimetype);
  const group = await prisma.group.update({
    where: { id },
    data: { avatarUrl: result.url },
  });

  res.json({ success: true, data: { group } });
});

export const deleteGroup = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = param(req.params.id);
  const group = await prisma.group.findUnique({ where: { id } });
  if (!group || group.ownerId !== req.user!.userId) {
    throw new AppError('Only owner can delete group', 403);
  }

  await prisma.group.update({ where: { id }, data: { isDeleted: true } });
  res.json({ success: true, message: 'Group deleted' });
});

export const addMembers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = param(req.params.id);
  const { memberIds } = req.body as { memberIds: string[] };
  await requireAdmin(id, req.user!.userId);

  const group = await prisma.group.findUnique({ where: { id } });
  if (!group || group.isDeleted) throw new AppError('Group not found', 404);

  const existingUsers = await prisma.user.findMany({
    where: { id: { in: memberIds }, status: 'ACTIVE' },
    select: { id: true },
  });
  const validIds = new Set(existingUsers.map((u) => u.id));
  for (const uid of memberIds) {
    if (!validIds.has(uid)) throw new AppError(`User ${uid} not found`, 404);
  }

  for (const userId of memberIds) {
    await prisma.groupMember.upsert({
      where: { groupId_userId: { groupId: id, userId } },
      create: { groupId: id, userId, role: 'MEMBER' },
      update: {},
    });
    await prisma.notification.create({
      data: {
        userId,
        type: 'GROUP_INVITE',
        title: 'Added to group',
        body: `You were added to ${group.name}`,
        data: { groupId: id },
      },
    });
  }

  const members = await prisma.groupMember.findMany({
    where: { groupId: id },
    include: memberInclude,
  });

  res.json({ success: true, data: { members } });
});

export const removeMember = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = param(req.params.id);
  const userId = param(req.params.userId);
  const membership = await requireAdmin(id, req.user!.userId);

  const target = await getMembership(id, userId);
  if (!target) throw new AppError('Member not found', 404);
  if (target.role === 'OWNER') throw new AppError('Cannot remove owner', 403);
  if (target.role === 'ADMIN' && membership.role !== 'OWNER') {
    throw new AppError('Only owner can remove admins', 403);
  }

  await prisma.groupMember.delete({
    where: { groupId_userId: { groupId: id, userId } },
  });

  res.json({ success: true, message: 'Member removed' });
});

export const updateMemberRole = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = param(req.params.id);
  const userId = param(req.params.userId);
  const { role } = req.body as { role: GroupRole };
  const group = await prisma.group.findUnique({ where: { id } });
  if (!group || group.ownerId !== req.user!.userId) {
    throw new AppError('Only owner can change roles', 403);
  }
  if (role === 'OWNER') throw new AppError('Cannot transfer ownership this way', 400);

  const member = await prisma.groupMember.update({
    where: { groupId_userId: { groupId: id, userId } },
    data: { role },
    include: memberInclude,
  });

  res.json({ success: true, data: { member } });
});

export const leaveGroup = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = param(req.params.id);
  const membership = await requireMember(id, req.user!.userId);
  if (membership.role === 'OWNER') {
    throw new AppError('Owner must transfer ownership or delete the group', 400);
  }

  await prisma.groupMember.delete({
    where: { groupId_userId: { groupId: id, userId: req.user!.userId } },
  });

  res.json({ success: true, message: 'Left group' });
});

export const sendGroupMessage = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = param(req.params.id);
  await requireMember(id, req.user!.userId);

  const { content, type = 'TEXT', fileUrl, fileName, fileSize, mimeType, replyToId } = req.body;
  if (!content && !fileUrl) throw new AppError('Message content or file required', 400);
  assertAllowedFileUrl(fileUrl);
  await assertValidGroupReply(replyToId, id);

  const message = await prisma.groupMessage.create({
    data: {
      groupId: id,
      senderId: req.user!.userId,
      content,
      type,
      fileUrl,
      fileName,
      fileSize,
      mimeType,
      replyToId,
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
    },
  });

  res.status(201).json({ success: true, data: { message } });
});

export const getGroupMessages = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = param(req.params.id);
  await requireMember(id, req.user!.userId);

  const cursor = req.query.cursor as string | undefined;
  const limit = Math.min(parseInt((req.query.limit as string) || '50', 10), 100);

  const messages = await prisma.groupMessage.findMany({
    where: { groupId: id, isDeleted: false },
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
    },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = messages.length > limit;
  const items = hasMore ? messages.slice(0, limit) : messages;

  res.json({
    success: true,
    data: {
      messages: items.reverse(),
      nextCursor: hasMore ? items[items.length - 1]?.id : null,
      hasMore,
    },
  });
});
