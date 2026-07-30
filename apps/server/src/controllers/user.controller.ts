import { Response } from 'express';
import path from 'path';
import { prisma } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { AppError, asyncHandler } from '../utils/errors';
import { comparePassword, hashPassword } from '../utils/password';
import { uploadToCloudinary } from '../utils/upload';
import { param } from '../utils/params';

const publicUserSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  bio: true,
  onlineStatus: true,
  lastSeenAt: true,
  createdAt: true,
} as const;

export const getProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const username = param(req.params.username);
  const user = await prisma.user.findUnique({
    where: { username: username.toLowerCase() },
    select: {
      ...publicUserSelect,
      showOnlineStatus: true,
      showLastSeen: true,
    },
  });
  if (!user) throw new AppError('User not found', 404);

  const result = {
    ...user,
    onlineStatus: user.showOnlineStatus ? user.onlineStatus : 'OFFLINE',
    lastSeenAt: user.showLastSeen ? user.lastSeenAt : null,
  };
  delete (result as { showOnlineStatus?: boolean }).showOnlineStatus;
  delete (result as { showLastSeen?: boolean }).showLastSeen;

  res.json({ success: true, data: { user: result } });
});

export const updateProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.update({
    where: { id: req.user!.userId },
    data: req.body,
    select: {
      id: true,
      username: true,
      email: true,
      displayName: true,
      avatarUrl: true,
      bio: true,
      role: true,
      onlineStatus: true,
      lastSeenAt: true,
      emailVerified: true,
      theme: true,
      themeColor: true,
      wallpaper: true,
      showOnlineStatus: true,
      showLastSeen: true,
      allowFriendRequests: true,
      notifyMessages: true,
      notifyFriendRequests: true,
      notifyGroups: true,
      createdAt: true,
    },
  });
  res.json({ success: true, data: { user } });
});

export const uploadAvatar = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.file) throw new AppError('No file provided', 400);

  req.file.originalname = req.file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 100);

  const result = await uploadToCloudinary(req.file.buffer, 'avatars', 'image', req.file.mimetype);

  await prisma.uploadedFile.create({
    data: {
      userId: req.user!.userId,
      url: result.url,
      publicId: result.publicId,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      resourceType: result.resourceType,
    },
  });

  const user = await prisma.user.update({
    where: { id: req.user!.userId },
    data: { avatarUrl: result.url },
    select: publicUserSelect,
  });

  res.json({ success: true, data: { user, url: result.url } });
});

export const changePassword = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!user) throw new AppError('User not found', 404);

  if (!(await comparePassword(currentPassword, user.passwordHash))) {
    throw new AppError('Current password is incorrect', 400);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(newPassword) },
  });

  res.json({ success: true, message: 'Password updated' });
});

export const searchUsers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const q = (req.query.q as string) || '';
  const page = parseInt((req.query.page as string) || '1', 10);
  const limit = Math.min(parseInt((req.query.limit as string) || '20', 10), 50);
  const skip = (page - 1) * limit;

  if (q.length < 1) {
    return res.json({ success: true, data: { users: [], total: 0, page, limit } });
  }

  const where = {
    AND: [
      { id: { not: req.user!.userId } },
      { status: 'ACTIVE' as const },
      {
        OR: [
          { username: { contains: q.toLowerCase(), mode: 'insensitive' as const } },
          { displayName: { contains: q, mode: 'insensitive' as const } },
        ],
      },
    ],
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: publicUserSelect,
      skip,
      take: limit,
      orderBy: { username: 'asc' },
    }),
    prisma.user.count({ where }),
  ]);

  res.json({ success: true, data: { users, total, page, limit } });
});
