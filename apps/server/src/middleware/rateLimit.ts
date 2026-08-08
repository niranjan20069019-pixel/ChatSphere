import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

const skipRequest = (req: { method?: string; path?: string; originalUrl?: string }) => {
  if (req.method === 'GET') {
    const url = req.originalUrl || req.path || '';
    if (url.startsWith('/api/health')) return true;
    if (!url.startsWith('/api')) return true;
  }
  return false;
};

export const globalLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipRequest,
  message: { success: false, message: 'Too many requests, please try again later' },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many auth attempts, please try again later' },
});

export const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { success: false, message: 'Too many uploads' },
});

export const messageLimiter = rateLimit({
  windowMs: 10 * 1000,
  max: 30,
  message: { success: false, message: 'Too many messages, slow down' },
});
