import path from 'path';
import { randomUUID } from 'crypto';
import { ApiError } from '../../utils/apiError';
import { saveFile } from '../../lib/storage';
import { ListMediaInput, CreateMediaInput, UpdateMediaInput, MEDIA_FOLDERS, MediaFolder } from './media.schema';
import * as repo from './media.repository';

export async function listMedia(input: ListMediaInput) {
  return repo.findMedia(input);
}

export async function getMediaById(id: string) {
  const asset = await repo.findMediaById(id);
  if (!asset) throw ApiError.notFound('Media asset');
  return asset;
}

export async function createMedia(input: CreateMediaInput) {
  return repo.createMedia(input);
}

export async function updateMedia(id: string, input: UpdateMediaInput) {
  await getMediaById(id);
  return repo.updateMedia(id, input);
}

export async function deleteMedia(id: string) {
  await getMediaById(id);
  return repo.softDeleteMedia(id);
}

// ─── File upload ───────────────────────────────────────────────────────────────

const ALLOWED_UPLOAD_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm']);

/**
 * Save an uploaded file under the chosen folder and create a MediaAsset record.
 * @param file   Multer file from the request
 * @param folder Sub-directory key ('products' | 'avatars' | 'carousel' | 'blog' | 'news' | 'topics' | 'media')
 */
export async function uploadMediaFile(file: Express.Multer.File, folder: MediaFolder = 'media') {
  if (!ALLOWED_UPLOAD_TYPES.has(file.mimetype)) {
    throw ApiError.badRequest(`File type "${file.mimetype}" is not allowed.`);
  }
  // Validate folder key against the known list
  if (!MEDIA_FOLDERS.includes(folder)) {
    throw ApiError.badRequest(`Unknown folder "${folder}".`);
  }
  const ext = path.extname(file.originalname) || '.jpg';
  const now = new Date();
  const storageKey = `${folder}/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${randomUUID()}${ext}`;
  saveFile(storageKey, file.buffer);
  const url = `/uploads/${storageKey}`;
  const mediaType = file.mimetype.startsWith('video/') ? 'video' : 'image';
  return repo.createMedia({
    url,
    altText: file.originalname,
    mediaType,
    metadata: {
      mimeType: file.mimetype,
      fileSizeBytes: file.size,
    },
  });
}

