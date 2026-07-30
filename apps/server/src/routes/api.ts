import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import friendsRoutes from './friends.routes';
import messagesRoutes from './messages.routes';
import groupsRoutes from './groups.routes';
import notificationsRoutes from './notifications.routes';
import adminRoutes from './admin.routes';
import uploadRoutes from './upload.routes';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'ChatSphere API is healthy',
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
