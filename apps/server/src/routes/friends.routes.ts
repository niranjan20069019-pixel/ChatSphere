import { Router } from 'express';
import * as friends from '../controllers/friends.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  reportSchema,
  sendFriendRequestSchema,
  blockUserSchema,
} from '../validators/schemas';

const router = Router();

router.use(authenticate);

router.get('/', friends.getFriends);
router.get('/requests', friends.getPendingRequests);
router.get('/blocked', friends.getBlockedUsers);
router.post('/request', validate(sendFriendRequestSchema), friends.sendFriendRequest);
router.post('/request/:id/accept', friends.acceptFriendRequest);
router.post('/request/:id/reject', friends.rejectFriendRequest);
router.post('/request/:id/cancel', friends.cancelFriendRequest);
router.delete('/:userId', friends.removeFriend);
router.post('/block', validate(blockUserSchema), friends.blockUser);
router.delete('/block/:userId', friends.unblockUser);
router.post('/report', validate(reportSchema), friends.reportUser);

export default router;
