import { Response } from 'express';
import { prisma } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { AppError, asyncHandler } from '../utils/errors';
import { param } from '../utils/params';

export const getDashboardStats = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const [
    totalUsers,
    activeUsers,
    bannedUsers,
    suspendedUsers,
    totalMessages,
    totalGroups,
    totalReports,
    pendingReports,
    onlineUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: 'ACTIVE' } }),
    prisma.user.count({ where: { status: 'BANNED' } }),
    prisma.user.count({ where: { status: 'SUSPENDED' } }),
    prisma.message.count(),
    prisma.group.count({ where: { isDeleted: false } }),
    prisma.report.count(),
    prisma.report.count({ where: { status: 'PENDING' } }),
    prisma.user.count({ where: { onlineStatus: 'ONLINE' } }),
  ]);

  const last7Days = new Date();
  last7Days.setDate(last7Days.getDate() - 7);

  const [newUsers, newMessages] = await Promise.all([
    prisma.user.count({ where: { createdAt: { gte: last7Days } } }),
    prisma.message.count({ where: { createdAt: { gte: last7Days } } }),
  ]);

  res.json({
    success: true,
    data: {
      users: { total: totalUsers, active: activeUsers, banned: bannedUsers, suspended: suspendedUsers, online: onlineUsers, newLast7Days: newUsers },
      messages: { total: totalMessages, newLast7Days: newMessages },
      groups: { total: totalGroups },
      reports: { total: totalReports, pending: pendingReports },
    },
  });
});

export const getUsers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const page = parseInt((req.query.page as string) || '1', 10);
  const limit = Math.min(parseInt((req.query.limit as string) || '20', 10), 100);
  const q = (req.query.q as string) || '';
  const status = req.query.status as string | undefined;

  const where = {
    ...(status ? { status: status as 'ACTIVE' | 'SUSPENDED' | 'BANNED' } : {}),
    ...(q
      ? {
          OR: [
            { username: { contains: q, mode: 'insensitive' as const } },
            { email: { contains: q, mode: 'insensitive' as const } },
            { displayName: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        role: true,
        status: true,
        onlineStatus: true,
        emailVerified: true,
        createdAt: true,
        lastSeenAt: true,
        _count: { select: { sentMessages: true, groupMemberships: true } },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where }),
  ]);

  res.json({ success: true, data: { users, total, page, limit } });
});

export const updateUserStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = param(req.params.id);
  const { status, role } = req.body;

  if (id === req.user!.userId) throw new AppError('Cannot modify your own account this way', 400);

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(status && { status }),
      ...(role && { role }),
    },
    select: {
      id: true,
      username: true,
      email: true,
      displayName: true,
      role: true,
      status: true,
    },
  });

  if (status === 'BANNED' || status === 'SUSPENDED') {
    await prisma.session.deleteMany({ where: { userId: id } });
  }

  res.json({ success: true, data: { user } });
});

export const getReports = asyncHandler(async (req: AuthRequest, res: Response) => {
  const page = parseInt((req.query.page as string) || '1', 10);
  const limit = Math.min(parseInt((req.query.limit as string) || '20', 10), 100);
  const status = req.query.status as string | undefined;

  const where = status ? { status: status as 'PENDING' | 'REVIEWED' | 'RESOLVED' | 'DISMISSED' } : {};

  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      where,
      include: {
        reporter: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        reported: { select: { id: true, username: true, displayName: true, avatarUrl: true, status: true } },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.report.count({ where }),
  ]);

  res.json({ success: true, data: { reports, total, page, limit } });
});

export const updateReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = param(req.params.id);
  const { status, reviewNote } = req.body;

  const report = await prisma.report.update({
    where: { id },
    data: {
      status,
      reviewNote,
      reviewedBy: req.user!.userId,
    },
    include: {
      reporter: { select: { id: true, username: true, displayName: true } },
      reported: { select: { id: true, username: true, displayName: true } },
    },
  });

  res.json({ success: true, data: { report } });
});

export const getMessageStats = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const days = 14;
  const stats = [];

  for (let i = days - 1; i >= 0; i--) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - i);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const [dmCount, groupCount] = await Promise.all([
      prisma.message.count({ where: { createdAt: { gte: start, lt: end } } }),
      prisma.groupMessage.count({ where: { createdAt: { gte: start, lt: end } } }),
    ]);

    stats.push({
      date: start.toISOString().slice(0, 10),
      directMessages: dmCount,
      groupMessages: groupCount,
      total: dmCount + groupCount,
    });
  }

  res.json({ success: true, data: { stats } });
});
