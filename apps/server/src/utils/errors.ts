import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { ZodError } from 'zod';
import { logger } from '../config/logger';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  code?: string;

  constructor(message: string, statusCode = 400, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

function isAdmin(req: Request): boolean {
  const user = (req as unknown as { user?: { role?: string } }).user;
  return user?.role === 'ADMIN';
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const admin = isAdmin(req);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code,
      ...(admin && { stack: err.stack }),
    });
  }

  if (err instanceof multer.MulterError) {
    const messages: Record<string, string> = {
      LIMIT_FILE_SIZE: 'File too large',
      LIMIT_UNEXPECTED_FILE: 'Unexpected file field',
      LIMIT_FILE_COUNT: 'Too many files',
    };
    return res.status(400).json({
      success: false,
      message: messages[err.code] || 'Upload failed',
      ...(admin && { code: err.code, stack: err.stack }),
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      ...(admin && { errors: err.errors.map((e) => ({ path: e.path.join('.'), message: e.message })) }),
    });
  }

  logger.error(err.stack || err.message);

  return res.status(500).json({
    success: false,
    message: admin ? err.message : 'Something went wrong',
    ...(admin && { stack: err.stack }),
  });
};

export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
