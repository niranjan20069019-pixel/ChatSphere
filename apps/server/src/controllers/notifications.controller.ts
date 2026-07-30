import { Response } from 'express';
import { prisma } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../utils/errors';
import { param } from '../utils/params';

export const getNotifications = asyncHandler(async (req: AuthRequest, res: Response) => {
  const page = parseInt((req.query.page as string) || '1', 10);
  const limit = Math.min(parseInt((req.query.limit as string) || '30', 10), 50);
  const unreadOnly = req.query.unread === 'true';

  const where = {
    userId: req.user!.userId,
    ...(unreadOnly ? { isRead: false } : {}),
  };

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({
      where: { userId: req.user!.userId, isRead: false },
    }),
  ]);

  res.json({
    success: true,
    data: { notifications, total, unreadCount, page, limit },
  });
});

export const markAsRead = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = param(req.params.id);
  await prisma.notification.updateMany({
    where: { id, userId: req.user!.userId },
    data: { isRead: true },
  });
  res.json({ success: true, message: 'Marked as read' });
});

export const markAllAsRead = asyncHandler(async (req: AuthRequest, res: Response) => {
  await prisma.notification.updateMany({
    where: { userId: req.user!.userId, isRead: false },
    data: { isRead: true },
  });
  res.json({ success: true, message: 'All notifications marked as read' });
});

export const deleteNotification = asyncHandler(async (req: AuthRequest, res: Response) => {
  await prisma.notification.deleteMany({
    where: { id: param(req.params.id), userId: req.user!.userId },
  });
  res.json({ success: true, message: 'Notification deleted' });
});
