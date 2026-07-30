import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { verifyAccessToken, TokenPayload } from '../utils/jwt';
import { AppError } from '../utils/errors';
import { prisma } from '../config/database';

export interface AuthRequest extends Request {
  user?: TokenPayload & { email?: string; username?: string };
}

export const authenticate = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    const header = req.headers.authorization;
    const token =
      header?.startsWith('Bearer ') ? header.slice(7) : req.cookies?.accessToken;

    if (!token) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');

    const payload = verifyAccessToken(token);

    if (payload.sessionId) {
      const session = await prisma.session.findUnique({
        where: { id: payload.sessionId },
        select: { id: true, userId: true, expiresAt: true },
      });
      if (
        !session ||
        session.userId !== payload.userId ||
        session.expiresAt < new Date()
      ) {
        throw new AppError('Session expired', 401, 'UNAUTHORIZED');
      }
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true, status: true, email: true, username: true },
    });

    if (!user) throw new AppError('User not found', 401, 'UNAUTHORIZED');
    if (user.status === 'BANNED') throw new AppError('Account banned', 403, 'BANNED');
    if (user.status === 'SUSPENDED') throw new AppError('Account suspended', 403, 'SUSPENDED');

    req.user = {
      userId: user.id,
      role: user.role,
      sessionId: payload.sessionId,
      email: user.email,
      username: user.username,
    };
    next();
  } catch (err) {
    if (err instanceof AppError) return next(err);
    next(new AppError('Invalid or expired token', 401, 'UNAUTHORIZED'));
  }
};

export const authorize = (...roles: UserRole[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError('Authentication required', 401));
    if (!roles.includes(req.user.role as UserRole)) {
      return next(new AppError('Insufficient permissions', 403, 'FORBIDDEN'));
    }
    next();
  };
};

export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    const header = req.headers.authorization;
    const token =
      header?.startsWith('Bearer ') ? header.slice(7) : req.cookies?.accessToken;
    if (token) {
      const payload = verifyAccessToken(token);
      req.user = payload;
    }
  } catch {
    // ignore
  }
  next();
};
