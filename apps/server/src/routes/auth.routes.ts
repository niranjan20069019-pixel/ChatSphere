import { Router } from 'express';
import * as auth from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { authLimiter } from '../middleware/rateLimit';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validators/schemas';

const router = Router();

router.post('/register', authLimiter, validate(registerSchema), auth.register);
router.post('/login', authLimiter, validate(loginSchema), auth.login);
router.post('/logout', authenticate, auth.logout);
router.post('/refresh', auth.refresh);
router.get('/me', authenticate, auth.me);
router.post('/verify-email', auth.verifyEmail);
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), auth.forgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), auth.resetPassword);
router.post('/resend-verification', authLimiter, auth.resendVerification);
router.get('/sessions', authenticate, auth.getSessions);
router.delete('/sessions/:sessionId', authenticate, auth.revokeSession);

export default router;
