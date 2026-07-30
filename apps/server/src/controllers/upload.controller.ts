import { Response } from 'express';
import path from 'path';
import { prisma } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { AppError, asyncHandler } from '../utils/errors';
import { uploadToCloudinary } from '../utils/upload';
import { validateFileBuffer } from '../middleware/upload';

function getResourceType(mime: string): 'image' | 'video' | 'raw' | 'auto' {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'video'; // cloudinary treats audio as video
  return 'raw';
}

function sanitizeFilename(name: string): string {
  const ext = path.extname(name).slice(0, 20);
  const base = path.basename(name, ext)
    .replace(/[^a-zA-Z0-9_\-. ]/g, '_')
    .slice(0, 100);
  return base + ext;
}

export const uploadFile = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.file) throw new AppError('No file provided', 400);

  validateFileBuffer(req.file.buffer, req.file.mimetype);
  const safeName = sanitizeFilename(req.file.originalname);

  const resourceType = getResourceType(req.file.mimetype);
  const result = await uploadToCloudinary(req.file.buffer, 'media', resourceType, req.file.mimetype);

  const file = await prisma.uploadedFile.create({
    data: {
      userId: req.user!.userId,
      url: result.url,
      publicId: result.publicId,
      fileName: safeName,
      mimeType: req.file.mimetype,
      size: req.file.size,
      resourceType: result.resourceType,
    },
  });

  res.status(201).json({
    success: true,
    data: {
      file: {
        id: file.id,
        url: file.url,
        fileName: file.fileName,
        mimeType: file.mimeType,
        size: file.size,
        resourceType: file.resourceType,
      },
    },
  });
});
