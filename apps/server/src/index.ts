import express from 'express';
import http from 'http';
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
const server = http.createServer(app);

app.set('trust proxy', 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(globalLimiter);

app.use('/api', apiRoutes);

app.use(errorHandler);

const io = setupSocketIO(server);

server.listen(env.PORT, () => {
  logger.info(`ChatSphere API running on port ${env.PORT} [${env.NODE_ENV}]`);
  logger.info(`Client URL: ${env.CLIENT_URL}`);
});

export { app, server, io };
