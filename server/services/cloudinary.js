import { v2 as cloudinary } from 'cloudinary';
import { randomUUID } from 'node:crypto';
import { config } from '../config.js';

cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
  secure: true,
});

export function uploadImage(buffer, folder = 'texmaco-brochure') {
  if (!config.cloudinary.cloudName || !config.cloudinary.apiKey || !config.cloudinary.apiSecret) {
    throw new Error('Cloudinary credentials are not configured.');
  }
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({
      folder, resource_type: 'image',
      transformation: [{ quality: 'auto', fetch_format: 'auto' }],
    }, (error, result) => error ? reject(error) : resolve(result));
    stream.end(buffer);
  });
}

function uploadVideoAttempt(filePath, publicId) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_large(filePath, {
      folder: 'texmaco-brochure/videos', public_id: publicId,
      unique_filename: false, overwrite: true, resource_type: 'video',
      chunk_size: 6 * 1024 * 1024,
      timeout: 10 * 60 * 1000,
      eager: [{ format: 'mp4', quality: 'auto' }], eager_async: true,
    }, (error, result) => error ? reject(error) : resolve(result));
  });
}

export async function uploadVideo(filePath) {
  if (!config.cloudinary.cloudName || !config.cloudinary.apiKey || !config.cloudinary.apiSecret) {
    throw new Error('Cloudinary credentials are not configured.');
  }
  const publicId = `featured-${Date.now()}-${randomUUID()}`;
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await uploadVideoAttempt(filePath, publicId);
    } catch (error) {
      lastError = error;
      const code = error.code || error.error?.code;
      const httpCode = error.http_code || error.error?.http_code;
      const retryable = ['ECONNRESET', 'ETIMEDOUT', 'EPIPE', 'ENETUNREACH'].includes(code) || httpCode >= 500;
      if (!retryable || attempt === 3) break;
      await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
    }
  }
  throw lastError;
}

export async function deleteImage(publicId) {
  if (!publicId || !config.cloudinary.cloudName) return;
  await cloudinary.uploader.destroy(publicId);
}


export async function deleteVideo(publicId) {
  if (!publicId || !config.cloudinary.cloudName) return;
  await cloudinary.uploader.destroy(publicId, { resource_type: 'video', invalidate: true });
}
