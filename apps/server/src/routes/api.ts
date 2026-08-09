import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import friendsRoutes from './friends.routes';
import messagesRoutes from './messages.routes';
import groupsRoutes from './groups.routes';
import notificationsRoutes from './notifications.routes';
import adminRoutes from './admin.routes';
import uploadRoutes from './upload.routes';
import { prisma } from '../config/database';

const router = Router();

router.get('/health', async (_req, res) => {
  let database = 'ok';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    database = 'down';
  }
  res.status(database === 'ok' ? 200 : 503).json({
    success: database === 'ok',
    message:
      database === 'ok'
        ? 'ChatSphere API is healthy'
        : 'Database unreachable — check DATABASE_URL',
    database,
    timestamp: new Date().toISOString(),
  });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/friends', friendsRoutes);
router.use('/messages', messagesRoutes);
router.use('/groups', groupsRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/admin', adminRoutes);
router.use('/upload', uploadRoutes);

export default router;
