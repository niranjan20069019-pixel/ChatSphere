import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface TokenPayload {
  userId: string;
  role: string;
  sessionId?: string;
}

export const signAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES as jwt.SignOptions['expiresIn'],
  });
};

export const signRefreshToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES as jwt.SignOptions['expiresIn'],
  });
};

export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload;
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as TokenPayload;
};

export const getRefreshExpiryDate = (): Date => {
  const days = parseInt(env.JWT_REFRESH_EXPIRES.replace(/\D/g, '') || '7', 10);
  const unit = env.JWT_REFRESH_EXPIRES.slice(-1);
  const date = new Date();
  if (unit === 'd') date.setDate(date.getDate() + days);
  else if (unit === 'h') date.setHours(date.getHours() + days);
  else date.setDate(date.getDate() + 7);
  return date;
};
