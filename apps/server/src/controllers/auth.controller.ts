import { Response } from 'express';
import { prisma } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { AppError, asyncHandler } from '../utils/errors';
import { hashPassword, comparePassword } from '../utils/password';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  getRefreshExpiryDate,
} from '../utils/jwt';
import { sendVerificationEmail, sendPasswordResetEmail, isEmailConfigured } from '../services/email.service';
import { logger } from '../config/logger';
import { env } from '../config/env';
import { param } from '../utils/params';
import { generateSecureToken, hashToken } from '../utils/tokens';

const userSelect = {
  id: true,
  username: true,
  email: true,
  displayName: true,
  avatarUrl: true,
  bio: true,
  role: true,
  onlineStatus: true,
  lastSeenAt: true,
  emailVerified: true,
  theme: true,
  themeColor: true,
  wallpaper: true,
  showOnlineStatus: true,
  showLastSeen: true,
  allowFriendRequests: true,
  notifyMessages: true,
  notifyFriendRequests: true,
  notifyGroups: true,
  createdAt: true,
} as const;

const setAuthCookies = (res: Response, accessToken: string, refreshToken: string) => {
  const common = {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: 'lax' as const,
    path: '/',
  };
  res.cookie('accessToken', accessToken, { ...common, maxAge: 15 * 60 * 1000 });
  res.cookie('refreshToken', refreshToken, {
    ...common,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

const clearAuthCookies = (res: Response) => {
  res.clearCookie('accessToken', { path: '/' });
  res.clearCookie('refreshToken', { path: '/' });
};

async function issueSession(
  res: Response,
  user: { id: string; role: string },
  req: AuthRequest
) {
  const session = await prisma.session.create({
    data: {
      userId: user.id,
      refreshToken: '',
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
      expiresAt: getRefreshExpiryDate(),
    },
  });

  const accessToken = signAccessToken({
    userId: user.id,
    role: user.role,
    sessionId: session.id,
  });
  const refreshToken = signRefreshToken({
    userId: user.id,
    role: user.role,
    sessionId: session.id,
  });

  await prisma.session.update({
    where: { id: session.id },
    data: { refreshToken },
  });

  setAuthCookies(res, accessToken, refreshToken);
  return { accessToken, sessionId: session.id };
}

export const register = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { username, email, password, displayName } = req.body;

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }] },
  });
  if (existing) {
    throw new AppError(
      existing.email === email.toLowerCase() ? 'Email already registered' : 'Username taken',
      409
    );
  }

  const passwordHash = await hashPassword(password);
  const emailConfigured = isEmailConfigured();
  const rawVerifyToken = emailConfigured ? generateSecureToken() : null;

  const user = await prisma.user.create({
    data: {
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      passwordHash,
      displayName: displayName || username,
      ...(rawVerifyToken
        ? {
            emailVerifyToken: hashToken(rawVerifyToken),
            emailVerifyExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
          }
        : { emailVerified: true }),
    },
    select: userSelect,
  });

  if (rawVerifyToken) {
    const verificationUrl = `${env.FRONTEND_URL}/verify-email?token=${rawVerifyToken}`;
    try {
      await sendVerificationEmail(user.email, verificationUrl);
    } catch (err) {
      logger.error(`[AUTH] Failed to send verification email to ${user.email}: ${(err as Error).message}`);
    }
  }
  await issueSession(res, user, req);

  res.status(201).json({
    success: true,
    message: emailConfigured
      ? 'Registration successful. Please verify your email.'
      : 'Registration successful.',
    data: { user },
  });
});

export const login = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { emailOrUsername, password } = req.body;
  const identifier = emailOrUsername.toLowerCase();

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: identifier }, { username: identifier }],
    },
  });

  if (!user || !(await comparePassword(password, user.passwordHash))) {
    throw new AppError('Invalid credentials', 401);
  }

  if (user.status === 'BANNED') throw new AppError('Account banned', 403, 'BANNED');
  if (user.status === 'SUSPENDED') throw new AppError('Account suspended', 403, 'SUSPENDED');
  if (!user.emailVerified) throw new AppError('Please verify your email before logging in', 403, 'EMAIL_NOT_VERIFIED');

  await issueSession(res, user, req);

  await prisma.user.update({
    where: { id: user.id },
    data: { onlineStatus: 'ONLINE', lastSeenAt: new Date() },
  });

  const safeUser = await prisma.user.findUnique({ where: { id: user.id }, select: userSelect });

  res.json({
    success: true,
    message: 'Login successful',
    data: { user: safeUser },
  });
});

export const logout = asyncHandler(async (req: AuthRequest, res: Response) => {
  const refreshToken = req.cookies?.refreshToken;
  if (refreshToken) {
    await prisma.session.deleteMany({ where: { refreshToken, userId: req.user!.userId } });
  } else if (req.user?.sessionId) {
    await prisma.session.deleteMany({ where: { id: req.user.sessionId } });
  }

  if (req.user?.userId) {
    await prisma.user.update({
      where: { id: req.user.userId },
      data: { onlineStatus: 'OFFLINE', lastSeenAt: new Date() },
    });
  }

  clearAuthCookies(res);
  res.json({ success: true, message: 'Logged out' });
});

export const refresh = asyncHandler(async (req: AuthRequest, res: Response) => {
  const token = req.cookies?.refreshToken || req.body.refreshToken;
  if (!token) throw new AppError('Refresh token required', 401);

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw new AppError('Invalid refresh token', 401);
  }

  const session = await prisma.session.findUnique({ where: { refreshToken: token } });
  if (!session || session.expiresAt < new Date()) {
    // Reuse / stolen-token detection: revoke the claimed session
    if (payload.sessionId) {
      await prisma.session.deleteMany({ where: { id: payload.sessionId } });
    } else if (session) {
      await prisma.session.delete({ where: { id: session.id } });
    }
    clearAuthCookies(res);
    throw new AppError('Session expired', 401);
  }

  if (session.userId !== payload.userId || session.id !== payload.sessionId) {
    await prisma.session.deleteMany({ where: { id: session.id } });
    clearAuthCookies(res);
    throw new AppError('Invalid refresh token', 401);
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || user.status !== 'ACTIVE') {
    await prisma.session.deleteMany({ where: { id: session.id } });
    clearAuthCookies(res);
    throw new AppError('Unauthorized', 401);
  }

  const newAccessToken = signAccessToken({
    userId: user.id,
    role: user.role,
    sessionId: session.id,
  });
  const newRefreshToken = signRefreshToken({
    userId: user.id,
    role: user.role,
    sessionId: session.id,
  });

  // Atomic rotation: only succeed if the presented token is still current
  const rotated = await prisma.session.updateMany({
    where: { id: session.id, refreshToken: token },
    data: { refreshToken: newRefreshToken, expiresAt: getRefreshExpiryDate() },
  });

  if (rotated.count === 0) {
    await prisma.session.deleteMany({ where: { id: session.id } });
    clearAuthCookies(res);
    throw new AppError('Refresh token already used', 401);
  }

  setAuthCookies(res, newAccessToken, newRefreshToken);

  res.json({
    success: true,
    data: {},
  });
});

export const me = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: userSelect,
  });
  if (!user) throw new AppError('User not found', 404);
  res.json({ success: true, data: { user } });
});

export const verifyEmail = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { token } = req.body;
  if (!token || typeof token !== 'string') throw new AppError('Token required', 400);

  const user = await prisma.user.findFirst({
    where: {
      emailVerifyToken: hashToken(token),
      emailVerifyExpires: { gt: new Date() },
    },
  });
  if (!user) throw new AppError('Invalid or expired verification token', 400);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      emailVerifyToken: null,
      emailVerifyExpires: null,
    },
  });

  res.json({ success: true, message: 'Email verified successfully' });
});

export const forgotPassword = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { email } = req.body;
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

  if (user) {
    const rawToken = generateSecureToken();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: hashToken(rawToken),
        resetPasswordExpires: new Date(Date.now() + 15 * 60 * 1000),
      },
    });
    const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${rawToken}`;
    await sendPasswordResetEmail(user.email, resetUrl);
  }

  res.json({
    success: true,
    message: 'If an account exists with that email, a reset link has been sent.',
  });
});

export const resetPassword = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { token, password } = req.body;

  const existing = await prisma.user.findFirst({
    where: { resetPasswordToken: hashToken(token) },
  });

  if (!existing) throw new AppError('Invalid or expired reset token', 400, 'RESET_TOKEN_INVALID');

  if (existing.resetPasswordExpires && existing.resetPasswordExpires < new Date()) {
    throw new AppError('Reset link has expired. Please request a new one.', 400, 'RESET_TOKEN_EXPIRED');
  }

  const user = existing;

  const passwordHash = await hashPassword(password);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    },
  });

  await prisma.session.deleteMany({ where: { userId: user.id } });
  clearAuthCookies(res);

  res.json({ success: true, message: 'Password reset successful' });
});

export const resendVerification = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { email } = req.body;
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

  if (user && !user.emailVerified) {
    const rawToken = generateSecureToken();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifyToken: hashToken(rawToken),
        emailVerifyExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    const verificationUrl = `${env.FRONTEND_URL}/verify-email?token=${rawToken}`;
    await sendVerificationEmail(user.email, verificationUrl);
  }

  res.json({
    success: true,
    message: 'If the account exists and is not verified, a verification email has been sent.',
  });
});

export const getSessions = asyncHandler(async (req: AuthRequest, res: Response) => {
  const sessions = await prisma.session.findMany({
    where: { userId: req.user!.userId },
    select: {
      id: true,
      userAgent: true,
      ipAddress: true,
      createdAt: true,
      expiresAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, data: { sessions } });
});

export const revokeSession = asyncHandler(async (req: AuthRequest, res: Response) => {
  const sessionId = param(req.params.sessionId);
  await prisma.session.deleteMany({
    where: { id: sessionId, userId: req.user!.userId },
  });
  res.json({ success: true, message: 'Session revoked' });
});
