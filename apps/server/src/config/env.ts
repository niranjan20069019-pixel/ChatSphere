import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const DEFAULT_ACCESS = 'chatsphere-access-secret-change-me';
const DEFAULT_REFRESH = 'chatsphere-refresh-secret-change-me';
const PRODUCTION_FRONTEND = 'https://chatsphere-web.onrender.com';

const renderUrl =
  process.env.RENDER_EXTERNAL_URL ||
  process.env.RENDER_INSTANCE_URL ||
  (process.env.RENDER_SERVICE_NAME ? `https://${process.env.RENDER_SERVICE_NAME}.onrender.com` : '');

const clientUrl =
  renderUrl ||
  process.env.CLIENT_URL ||
  (process.env.NODE_ENV === 'production' ? PRODUCTION_FRONTEND : 'http://localhost:3000');

const jwtAccessSecret = process.env.JWT_ACCESS_SECRET || DEFAULT_ACCESS;
const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || DEFAULT_REFRESH;
const databaseUrl =
  process.env.DATABASE_URL ||
  process.env.RENDER_DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URI ||
  '';

if (process.env.NODE_ENV === 'production') {
  if (
    !process.env.JWT_ACCESS_SECRET ||
    !process.env.JWT_REFRESH_SECRET ||
    jwtAccessSecret === DEFAULT_ACCESS ||
    jwtRefreshSecret === DEFAULT_REFRESH
  ) {
    console.warn(
      '[env] JWT secrets were not provided for production; using fallback values. Set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET in Render for a secure deployment.'
    );
  }
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '4000', 10),
  DATABASE_URL: databaseUrl,
  JWT_ACCESS_SECRET: jwtAccessSecret,
  JWT_REFRESH_SECRET: jwtRefreshSecret,
  JWT_ACCESS_EXPIRES: process.env.JWT_ACCESS_EXPIRES || '15m',
  JWT_REFRESH_EXPIRES: process.env.JWT_REFRESH_EXPIRES || '7d',
  CLIENT_URL: clientUrl,
  FRONTEND_URL: process.env.FRONTEND_URL || clientUrl,
  CORS_ORIGINS: (process.env.CORS_ORIGINS || clientUrl)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  COOKIE_SECURE: process.env.COOKIE_SECURE === 'true',
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_SECURE: process.env.SMTP_SECURE === 'true',
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  EMAIL_FROM: process.env.EMAIL_FROM || 'ChatSphere <noreply@chatsphere.app>',
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '52428800', 10),
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '200', 10),
  get corsOrigins(): string[] {
    return this.CORS_ORIGINS;
  },
};
