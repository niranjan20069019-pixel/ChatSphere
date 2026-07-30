import multer from 'multer';
import { env } from '../config/env';
import { AppError } from '../utils/errors';

const ALLOWED_MIMES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
  'audio/mpeg',
  'audio/ogg',
  'audio/webm',
  'audio/wav',
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

function checkMagicBytes(buffer: Buffer, mimetype: string): boolean {
  const header = buffer.slice(0, 12);
  if (mimetype.startsWith('image/jpeg')) return header[0] === 0xFF && header[1] === 0xD8;
  if (mimetype.startsWith('image/png')) return header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47;
  if (mimetype.startsWith('image/gif')) return header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46;
  if (mimetype.startsWith('image/webp')) return (
    header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46 &&
    header[8] === 0x57 && header[9] === 0x45 && header[10] === 0x42 && header[11] === 0x50
  );
  if (mimetype.startsWith('video/mp4')) return header[4] === 0x66 && header[5] === 0x74 && header[6] === 0x79 && header[7] === 0x70;
  if (mimetype.startsWith('video/webm') || mimetype.startsWith('audio/webm')) return header[0] === 0x1A && header[1] === 0x45 && header[2] === 0xDF && header[3] === 0xA3;
  if (mimetype.startsWith('audio/mpeg')) return header[0] === 0xFF && (header[1] & 0xE0) === 0xE0;
  if (mimetype.startsWith('audio/ogg')) return header[0] === 0x4F && header[1] === 0x67 && header[2] === 0x67 && header[3] === 0x53;
  if (mimetype.startsWith('audio/wav')) return header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46;
  if (mimetype.startsWith('application/pdf')) return header[0] === 0x25 && header[1] === 0x50 && header[2] === 0x44 && header[3] === 0x46;
  return true;
}

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIMES.includes(file.mimetype)) {
      cb(new AppError(`File type ${file.mimetype} not allowed`, 400) as unknown as null, false);
      return;
    }
    cb(null, true);
  },
});

export function validateFileBuffer(buffer: Buffer, mimetype: string): void {
  if (!checkMagicBytes(buffer, mimetype)) {
    throw new AppError('File content does not match declared type', 400);
  }
}
