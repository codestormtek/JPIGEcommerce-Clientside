import path from 'path';
import { randomUUID } from 'crypto';
import { ApiError } from '../../utils/apiError';
import { saveFile, getPublicUrl } from '../../lib/storage';
import { ListMediaInput, CreateMediaInput, UpdateMediaInput, MEDIA_FOLDERS, MediaFolder } from './media.schema';
import * as repo from './media.repository';
import { resizeImage, buildVariantFilename, BLOG_VARIANTS, PAGE_VARIANTS, CAROUSEL_VARIANTS, ResizeVariant } from '../../lib/imageResize';

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

const ALLOWED_IMAGE_MIME  = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const ALLOWED_VIDEO_MIME  = new Set(['video/mp4', 'video/webm']);
const ALLOWED_DOC_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  // Adobe design files
  'application/postscript',
  'application/illustrator',
  'application/vnd.adobe.illustrator',
  'image/x-eps',
  'image/eps',
  // Archives
  'application/zip',
  'application/x-zip-compressed',
  'application/x-zip',
]);
const ALLOWED_UPLOAD_TYPES = new Set([...ALLOWED_IMAGE_MIME, ...ALLOWED_VIDEO_MIME, ...ALLOWED_DOC_MIME]);

function detectMediaType(mimeType: string): 'image' | 'video' | 'document' {
  if (ALLOWED_IMAGE_MIME.has(mimeType)) return 'image';
  if (ALLOWED_VIDEO_MIME.has(mimeType)) return 'video';
  return 'document';
}

// Extensions whose MIME type some OS/browsers report as application/octet-stream
const DESIGN_EXT_FALLBACK = new Map<string, string>([
  ['eps', 'application/postscript'],
  ['ai',  'application/illustrator'],
  ['ps',  'application/postscript'],
  ['zip', 'application/zip'],
]);

/**
 * Save an uploaded file under the chosen folder and create a MediaAsset record.
 * Accepts any folder slug — system or user-created.
 */
export async function uploadMediaFile(file: Express.Multer.File, folderSlug: string = 'media') {
  // Resolve MIME for design files that some OS/browsers send as octet-stream
  const rawExt = path.extname(file.originalname).replace('.', '').toLowerCase();
  const resolvedMime = (file.mimetype === 'application/octet-stream' && DESIGN_EXT_FALLBACK.has(rawExt))
    ? DESIGN_EXT_FALLBACK.get(rawExt)!
    : file.mimetype;

  if (!ALLOWED_UPLOAD_TYPES.has(resolvedMime)) {
    throw ApiError.badRequest(`File type "${file.mimetype}" is not allowed.`);
  }
  const ext = path.extname(file.originalname) || '.bin';
  const now = new Date();
  const storageKey = `${folderSlug}/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${randomUUID()}${ext}`;
  await saveFile(storageKey, file.buffer);
  const url = getPublicUrl(storageKey);
  const mediaType = detectMediaType(resolvedMime);
  return repo.createMedia({
    url,
    altText: file.originalname,
    mediaType,
    folder: folderSlug,
    metadata: {
      mimeType: resolvedMime,
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
  carousel: CAROUSEL_VARIANTS,
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

// ─── Folder management ────────────────────────────────────────────────────────

export async function listFolders() {
  return repo.listFolders();
}

export async function createFolder(input: import('./media.schema').CreateFolderInput) {
  const existing = await repo.findFolderBySlug(input.slug);
  if (existing) throw ApiError.conflict(`A folder with slug "${input.slug}" already exists.`);
  return repo.createFolder(input);
}

export async function updateFolder(slug: string, input: import('./media.schema').UpdateFolderInput) {
  const folder = await repo.findFolderBySlug(slug);
  if (!folder) throw ApiError.notFound('Folder');
  if (folder.isSystem) throw ApiError.badRequest('System folders cannot be renamed.');
  return repo.updateFolder(slug, input);
}

export async function deleteFolder(slug: string) {
  const folder = await repo.findFolderBySlug(slug);
  if (!folder) throw ApiError.notFound('Folder');
  if (folder.isSystem) throw ApiError.badRequest('System folders cannot be deleted.');
  return repo.deleteFolder(slug);
}

