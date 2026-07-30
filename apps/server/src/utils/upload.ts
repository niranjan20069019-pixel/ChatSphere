import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env';
import { AppError } from './errors';

const isConfigured =
  !!env.CLOUDINARY_CLOUD_NAME && !!env.CLOUDINARY_API_KEY && !!env.CLOUDINARY_API_SECRET;

if (isConfigured) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });
}

export const uploadToCloudinary = async (
  buffer: Buffer,
  folder: string,
  resourceType: 'image' | 'video' | 'raw' | 'auto' = 'auto',
  mimeType?: string
): Promise<{ url: string; publicId: string; resourceType: string }> => {
  if (!isConfigured) {
    const base64 = buffer.toString('base64');
    const url = mimeType
      ? `data:${mimeType};base64,${base64}`
      : `data:${resourceType === 'image' ? 'image/png' : 'application/octet-stream'};base64,${base64}`;
    return {
      url,
      publicId: `local/${folder}/${Date.now()}`,
      resourceType,
    };
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: `chatsphere/${folder}`, resource_type: resourceType },
      (error, result) => {
        if (error || !result) {
          reject(new AppError('File upload failed', 500));
          return;
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          resourceType: result.resource_type,
        });
      }
    );
    stream.end(buffer);
  });
};

export { isConfigured as cloudinaryConfigured };
