import { Response } from 'express';
import { prisma } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { AppError, asyncHandler } from '../utils/errors';
import { param } from '../utils/params';

const userBrief = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  onlineStatus: true,
  lastSeenAt: true,
  bio: true,
} as const;

export const sendFriendRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { userId } = req.body;
  const me = req.user!.userId;

  if (userId === me) throw new AppError('Cannot friend yourself', 400);

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.status !== 'ACTIVE') throw new AppError('User not found', 404);
  if (!target.allowFriendRequests) throw new AppError('User is not accepting friend requests', 403);

  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: me, addresseeId: userId },
        { requesterId: userId, addresseeId: me },
      ],
    },
  });

  if (existing) {
    if (existing.status === 'ACCEPTED') throw new AppError('Already friends', 409);
    if (existing.status === 'BLOCKED') throw new AppError('Unable to send request', 403);
    if (existing.status === 'PENDING') throw new AppError('Request already pending', 409);
  }

  const friendship = await prisma.friendship.create({
    data: { requesterId: me, addresseeId: userId, status: 'PENDING' },
    include: {
      requester: { select: userBrief },
      addressee: { select: userBrief },
    },
  });

  await prisma.notification.create({
    data: {
      userId,
      type: 'FRIEND_REQUEST',
      title: 'New friend request',
      body: `${friendship.requester.displayName} sent you a friend request`,
      data: { friendshipId: friendship.id, fromUserId: me },
    },
  });

  res.status(201).json({ success: true, data: { friendship } });
});

export const acceptFriendRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = param(req.params.id);
  const friendship = await prisma.friendship.findUnique({
    where: { id },
    include: { requester: { select: userBrief }, addressee: { select: userBrief } },
  });

  if (!friendship || friendship.addresseeId !== req.user!.userId) {
    throw new AppError('Request not found', 404);
  }
  if (friendship.status !== 'PENDING') throw new AppError('Request is not pending', 400);

  const updated = await prisma.friendship.update({
    where: { id },
    data: { status: 'ACCEPTED' },
    include: { requester: { select: userBrief }, addressee: { select: userBrief } },
  });

  await prisma.notification.create({
    data: {
      userId: friendship.requesterId,
      type: 'FRIEND_ACCEPTED',
      title: 'Friend request accepted',
      body: `${updated.addressee.displayName} accepted your friend request`,
      data: { friendshipId: id, fromUserId: req.user!.userId },
    },
  });

  res.json({ success: true, data: { friendship: updated } });
});

export const rejectFriendRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = param(req.params.id);
  const friendship = await prisma.friendship.findUnique({ where: { id } });
  if (!friendship || friendship.addresseeId !== req.user!.userId) {
    throw new AppError('Request not found', 404);
  }
  if (friendship.status !== 'PENDING') throw new AppError('Request is not pending', 400);

  await prisma.friendship.update({ where: { id }, data: { status: 'REJECTED' } });
  res.json({ success: true, message: 'Request rejected' });
});

export const cancelFriendRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = param(req.params.id);
  const friendship = await prisma.friendship.findUnique({ where: { id } });
  if (!friendship || friendship.requesterId !== req.user!.userId) {
    throw new AppError('Request not found', 404);
  }
  if (friendship.status !== 'PENDING') throw new AppError('Request is not pending', 400);

  await prisma.friendship.update({ where: { id }, data: { status: 'CANCELLED' } });
  res.json({ success: true, message: 'Request cancelled' });
});

export const removeFriend = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = param(req.params.userId);
  const me = req.user!.userId;

  const friendship = await prisma.friendship.findFirst({
    where: {
      status: 'ACCEPTED',
      OR: [
        { requesterId: me, addresseeId: userId },
        { requesterId: userId, addresseeId: me },
      ],
    },
  });
  if (!friendship) throw new AppError('Friendship not found', 404);

  await prisma.friendship.delete({ where: { id: friendship.id } });
  res.json({ success: true, message: 'Friend removed' });
});

export const blockUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { userId } = req.body;
  const me = req.user!.userId;
  if (userId === me) throw new AppError('Cannot block yourself', 400);

  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: me, addresseeId: userId },
        { requesterId: userId, addresseeId: me },
      ],
    },
  });

  if (existing) {
    await prisma.friendship.update({
      where: { id: existing.id },
      data: { status: 'BLOCKED', requesterId: me, addresseeId: userId },
    });
  } else {
    await prisma.friendship.create({
      data: { requesterId: me, addresseeId: userId, status: 'BLOCKED' },
    });
  }

  res.json({ success: true, message: 'User blocked' });
});

export const unblockUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = param(req.params.userId);
  const me = req.user!.userId;

  const friendship = await prisma.friendship.findFirst({
    where: { requesterId: me, addresseeId: userId, status: 'BLOCKED' },
  });
  if (!friendship) throw new AppError('Block not found', 404);

  await prisma.friendship.delete({ where: { id: friendship.id } });
  res.json({ success: true, message: 'User unblocked' });
});

export const getFriends = asyncHandler(async (req: AuthRequest, res: Response) => {
  const me = req.user!.userId;
  const friendships = await prisma.friendship.findMany({
    where: {
      status: 'ACCEPTED',
      OR: [{ requesterId: me }, { addresseeId: me }],
    },
    include: {
      requester: { select: userBrief },
      addressee: { select: userBrief },
    },
  });

  const friends = friendships.map((f) =>
    f.requesterId === me ? f.addressee : f.requester
  );

  res.json({ success: true, data: { friends } });
});

export const getPendingRequests = asyncHandler(async (req: AuthRequest, res: Response) => {
  const me = req.user!.userId;
  const [incoming, outgoing] = await Promise.all([
    prisma.friendship.findMany({
      where: { addresseeId: me, status: 'PENDING' },
      include: { requester: { select: userBrief } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.friendship.findMany({
      where: { requesterId: me, status: 'PENDING' },
      include: { addressee: { select: userBrief } },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  res.json({ success: true, data: { incoming, outgoing } });
});

export const getBlockedUsers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const blocked = await prisma.friendship.findMany({
    where: { requesterId: req.user!.userId, status: 'BLOCKED' },
    include: { addressee: { select: userBrief } },
  });
  res.json({
    success: true,
    data: { users: blocked.map((b) => b.addressee) },
  });
});

export const reportUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { reportedId, reason, description } = req.body;
  if (reportedId === req.user!.userId) throw new AppError('Cannot report yourself', 400);

  const reported = await prisma.user.findUnique({ where: { id: reportedId } });
  if (!reported) throw new AppError('User not found', 404);

  const report = await prisma.report.create({
    data: {
      reporterId: req.user!.userId,
      reportedId,
      reason,
      description,
    },
  });

  res.status(201).json({ success: true, data: { report } });
});
