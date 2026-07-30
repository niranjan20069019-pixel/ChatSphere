import { Router } from 'express';
import * as notifications from '../controllers/notifications.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', notifications.getNotifications);
router.patch('/read-all', notifications.markAllAsRead);
router.patch('/:id/read', notifications.markAsRead);
router.delete('/:id', notifications.deleteNotification);

export default router;
