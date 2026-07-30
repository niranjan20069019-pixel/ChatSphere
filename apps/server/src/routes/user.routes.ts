import { Router } from 'express';
import * as user from '../controllers/user.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { upload } from '../middleware/upload';
import { updateProfileSchema, changePasswordSchema } from '../validators/schemas';

const router = Router();

router.use(authenticate);

router.get('/search', user.searchUsers);
router.get('/:username', user.getProfile);
router.patch('/me', validate(updateProfileSchema), user.updateProfile);
router.post('/me/avatar', upload.single('avatar'), user.uploadAvatar);
router.post('/me/password', validate(changePasswordSchema), user.changePassword);

export default router;
