import { Router } from 'express';
import * as messages from '../controllers/messages.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { messageLimiter } from '../middleware/rateLimit';
import {
  sendMessageSchema,
  editMessageSchema,
  reactMessageSchema,
  chatSettingSchema,
} from '../validators/schemas';

const router = Router();

router.use(authenticate);

router.get('/conversations', messages.getConversations);
router.get('/search', messages.searchMessages);
router.get('/starred', messages.getStarredMessages);
router.get('/:userId', messages.getMessages);
router.post('/', messageLimiter, validate(sendMessageSchema), messages.sendMessage);
router.patch('/:id', validate(editMessageSchema), messages.editMessage);
router.delete('/:id', messages.deleteMessage);
router.post('/:id/react', validate(reactMessageSchema), messages.reactToMessage);
router.post('/:id/star', messages.starMessage);
router.post('/:id/pin', messages.pinMessage);
router.patch('/settings/:peerId', validate(chatSettingSchema), messages.updateChatSetting);

export default router;
