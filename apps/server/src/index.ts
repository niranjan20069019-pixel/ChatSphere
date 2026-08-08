import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { logger } from './config/logger';
import { errorHandler } from './utils/errors';
import { globalLimiter } from './middleware/rateLimit';
import apiRoutes from './routes/api';
import { setupSocketIO } from './sockets';

const app = express();
const isVercelRuntime = process.env.VERCEL === '1' || Boolean(process.env.VERCEL_URL);

const WEB_OUT_DIR = path.resolve(__dirname, '../../web/out');
const hasFrontendBuild = fs.existsSync(path.join(WEB_OUT_DIR, 'index.html'));

let server: http.Server | null = null;
let io: ReturnType<typeof setupSocketIO> | null = null;

app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        scriptSrcAttr: ["'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:', 'https://res.cloudinary.com'],
        mediaSrc: ["'self'", 'blob:', 'data:'],
        connectSrc: ["'self'", 'ws:', 'wss:', 'https://res.cloudinary.com'],
        fontSrc: ["'self'", 'data:'],
        workerSrc: ["'self'", 'blob:'],
      },
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(
  cors({
    origin: env.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(globalLimiter);

app.get('/', (_req, res) => {
  if (hasFrontendBuild) {
    return res.sendFile(path.join(WEB_OUT_DIR, 'index.html'));
  }
  res.json({
    success: true,
    name: 'ChatSphere API',
    version: '1.0.0',
    message: 'ChatSphere API is running. See /api/health for status.',
    endpoints: {
      health: '/api/health',
      docs: null,
    },
    frontend: env.FRONTEND_URL || env.CLIENT_URL,
    timestamp: new Date().toISOString(),
  });
});

app.use('/api', apiRoutes);

if (hasFrontendBuild) {
  app.use(
    express.static(WEB_OUT_DIR, {
      extensions: ['html'],
      index: 'index.html',
      maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0,
    })
  );

  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
    res.sendFile(path.join(WEB_OUT_DIR, 'index.html'));
  });
}

app.use(errorHandler);

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found. Available routes are under /api.',
  });
});

if (!isVercelRuntime) {
  server = http.createServer(app);
  io = setupSocketIO(server);

  const host = process.env.HOST || '0.0.0.0';
  server.listen(env.PORT, host, () => {
    logger.info(`ChatSphere API running on port ${env.PORT} [${env.NODE_ENV}] on ${host}`);
    logger.info(`Client URL: ${env.CLIENT_URL}`);
  });

  const shutdown = (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    server?.close(() => {
      io?.close();
      process.exit(0);
    });
    setTimeout(() => {
      logger.error('Forced shutdown after 10s timeout');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

export { app, server, io };
export default app;
