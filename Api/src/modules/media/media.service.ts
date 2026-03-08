import path from 'path';
import { randomUUID } from 'crypto';
import { ApiError } from '../../utils/apiError';
import { saveFile, getPublicUrl } from '../../lib/storage';
import { ListMediaInput, CreateMediaInput, UpdateMediaInput, MEDIA_FOLDERS, MediaFolder } from './media.schema';
import * as repo from './media.repository';
import { resizeImage, buildVariantFilename, BLOG_VARIANTS, PAGE_VARIANTS, ResizeVariant } from '../../lib/imageResize';

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
  await saveFile(storageKey, file.buffer);
  const url = getPublicUrl(storageKey);
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

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

const FOLDER_VARIANT_MAP: Record<string, ResizeVariant[]> = {
  blog: BLOG_VARIANTS,
  news: BLOG_VARIANTS,
  pages: PAGE_VARIANTS,
  topics: PAGE_VARIANTS,
};

export async function uploadWithResize(
  file: Express.Multer.File,
  folder: MediaFolder,
  name: string,
) {
  if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
    throw ApiError.badRequest(`Only image files are allowed for resized uploads (got "${file.mimetype}").`);
  }
  if (!MEDIA_FOLDERS.includes(folder)) {
    throw ApiError.badRequest(`Unknown folder "${folder}".`);
  }
  if (!name || !name.trim()) {
    throw ApiError.badRequest('A name is required for resized uploads.');
  }

  const variants: ResizeVariant[] = FOLDER_VARIANT_MAP[folder] ?? PAGE_VARIANTS;
  const ext = path.extname(file.originalname) || '.jpg';
  const now = new Date();
  const datePath = `${folder}/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`;
  const uid = randomUUID().slice(0, 8);

  const results: { suffix: string; asset: Awaited<ReturnType<typeof repo.createMedia>> }[] = [];

  for (const variant of variants) {
    const resizedBuffer = await resizeImage(file.buffer, variant.width, variant.height);
    const filename = buildVariantFilename(name, variant.suffix, ext, uid);
    const storageKey = `${datePath}/${filename}`;
    await saveFile(storageKey, resizedBuffer);
    const url = getPublicUrl(storageKey);
    const asset = await repo.createMedia({
      url,
      altText: `${name} (${variant.suffix})`,
      mediaType: 'image',
      metadata: {
        mimeType: file.mimetype,
        fileSizeBytes: resizedBuffer.length,
        widthPx: variant.width,
        heightPx: variant.height,
      },
    });
    results.push({ suffix: variant.suffix, asset });
  }

  const primary = results.find(r => r.suffix === 'xlarge') || results[0];
  return {
    primary: primary.asset,
    variants: results.map(r => ({ suffix: r.suffix, id: r.asset.id, url: r.asset.url })),
  };
}

