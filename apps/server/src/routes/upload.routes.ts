import { Router } from 'express';
import * as uploadCtrl from '../controllers/upload.controller';
import { authenticate } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { uploadLimiter } from '../middleware/rateLimit';

const router = Router();

router.post('/', authenticate, uploadLimiter, upload.single('file'), uploadCtrl.uploadFile);

export default router;
