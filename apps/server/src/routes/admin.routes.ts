import { Router } from 'express';
import * as admin from '../controllers/admin.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  adminUpdateUserSchema,
  adminUpdateReportSchema,
} from '../validators/schemas';

const router = Router();

router.use(authenticate, authorize('ADMIN', 'MODERATOR'));

router.get('/stats', admin.getDashboardStats);
router.get('/users', admin.getUsers);
router.patch('/users/:id', validate(adminUpdateUserSchema), admin.updateUserStatus);
router.get('/reports', admin.getReports);
router.patch('/reports/:id', validate(adminUpdateReportSchema), admin.updateReport);
router.get('/messages/stats', admin.getMessageStats);

export default router;
