import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const uploadRoot = path.resolve('uploads');
const maxImageBytes = Number(process.env.MAX_IMAGE_BYTES || 8 * 1024 * 1024);
const maxUserStorageBytes = Number(process.env.MAX_USER_STORAGE_BYTES || 150 * 1024 * 1024);

const mimeToExtension = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

export const getUploadRoot = () => uploadRoot;

export const ensureUploadRoot = async () => {
  await fs.mkdir(uploadRoot, { recursive: true });
};

export const decodeImageDataUrl = (imageDataUrl) => {
  const match = String(imageDataUrl).match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (!match) {
    throw new Error('Only JPEG, PNG, and WEBP images are supported.');
  }

  const mimeType = match[1];
  const buffer = Buffer.from(match[2], 'base64');

  if (!buffer.length) {
    throw new Error('Uploaded image is empty.');
  }

  if (buffer.length > maxImageBytes) {
    throw new Error(`Image is too large. Maximum size is ${Math.round(maxImageBytes / (1024 * 1024))} MB.`);
  }

  return { buffer, mimeType };
};

export const enforceUserStorageQuota = async (sql, userId, incomingBytes) => {
  const [row] = await sql`
    select coalesce(sum(s.image_size_bytes), 0)::bigint as bytes_used
    from snapshots s
    join plants p on p.id = s.plant_id
    where p.user_id = ${userId}
  `;

  const usedBytes = Number(row?.bytes_used || 0);
  if (usedBytes + incomingBytes > maxUserStorageBytes) {
    throw new Error(`Storage limit reached. Maximum per account is ${Math.round(maxUserStorageBytes / (1024 * 1024))} MB.`);
  }

  return {
    bytesUsed: usedBytes,
    bytesLimit: maxUserStorageBytes,
    bytesRemaining: Math.max(maxUserStorageBytes - usedBytes, 0),
  };
};

export const persistImageForUser = async (userId, imageDataUrl) => {
  const { buffer, mimeType } = decodeImageDataUrl(imageDataUrl);
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');
  const extension = mimeToExtension[mimeType];
  const userDir = path.join(uploadRoot, userId);
  const fileName = `${Date.now()}-${crypto.randomUUID()}${extension}`;
  const absolutePath = path.join(userDir, fileName);

  await fs.mkdir(userDir, { recursive: true });
  await fs.writeFile(absolutePath, buffer);

  return {
    relativePath: path.posix.join(userId, fileName),
    sizeBytes: buffer.length,
    mimeType,
    sha256: hash,
  };
};

export const removeStoredImage = async (relativePath) => {
  if (!relativePath) return;

  const absolutePath = path.join(uploadRoot, relativePath);
  await fs.rm(absolutePath, { force: true });
};
