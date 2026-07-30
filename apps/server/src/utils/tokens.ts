import crypto from 'crypto';

export const hashToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

export const generateSecureToken = (): string => crypto.randomBytes(32).toString('hex');
