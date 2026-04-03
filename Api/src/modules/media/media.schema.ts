import { z } from 'zod';

// ─── System folder keys ───────────────────────────────────────────────────────
export const MEDIA_FOLDERS = ['products', 'avatars', 'carousel', 'blog', 'news', 'topics', 'pages', 'categories', 'galleries', 'media', 'widgets'] as const;
export type MediaFolder = (typeof MEDIA_FOLDERS)[number];
export const SYSTEM_MEDIA_FOLDERS = MEDIA_FOLDERS;

// ─── Allowed MIME types ───────────────────────────────────────────────────────
export const ALLOWED_DOCUMENT_MIME = new Set([
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
  'application/postscript',        // .eps and .ai (most common MIME from OS/browser)
  'application/illustrator',       // .ai — Adobe Illustrator
  'application/vnd.adobe.illustrator', // .ai — alternative
  'image/x-eps',                   // .eps — alternative
  'image/eps',                     // .eps — alternative
  // Archives
  'application/zip',               // .zip (standard)
  'application/x-zip-compressed',  // .zip (Windows)
  'application/x-zip',             // .zip (alternative)
]);

// ─── List media ───────────────────────────────────────────────────────────────
export const listMediaSchema = z.object({
  page:           z.coerce.number().int().positive().default(1),
  limit:          z.coerce.number().int().positive().max(100).default(40),
  mediaType:      z.enum(['image', 'video', 'document']).optional(),
  folder:         z.string().optional(),
  orderBy:        z.enum(['createdAt', 'url']).default('createdAt'),
  order:          z.enum(['asc', 'desc']).default('desc'),
  includeDeleted: z.coerce.boolean().default(false),
});
export type ListMediaInput = z.infer<typeof listMediaSchema>;

// ─── Create media asset ────────────────────────────────────────────────────────
export const createMediaSchema = z.object({
  url:       z.string().url('Must be a valid URL'),
  altText:   z.string().optional(),
  mediaType: z.enum(['image', 'video', 'document']).default('image'),
  folder:    z.string().optional(),
  metadata: z.object({
    mimeType:       z.string().optional(),
    fileSizeBytes:  z.coerce.number().int().nonnegative().optional(),
    widthPx:        z.number().int().nonnegative().optional(),
    heightPx:       z.number().int().nonnegative().optional(),
    checksumSha256: z.string().optional(),
  }).optional(),
});
export type CreateMediaInput = z.infer<typeof createMediaSchema>;

// ─── Update media asset ────────────────────────────────────────────────────────
export const updateMediaSchema = createMediaSchema.partial().extend({
  isDeleted: z.boolean().optional(),
});
export type UpdateMediaInput = z.infer<typeof updateMediaSchema>;

// ─── Folder CRUD ──────────────────────────────────────────────────────────────
export const createFolderSchema = z.object({
  name:       z.string().min(1).max(80),
  slug:       z.string().min(1).max(120).regex(/^[a-z0-9_\-/]+$/, 'Only lowercase letters, numbers, underscores, hyphens, and slashes'),
  parentSlug: z.string().optional(),
});
export type CreateFolderInput = z.infer<typeof createFolderSchema>;

export const updateFolderSchema = z.object({
  name: z.string().min(1).max(80),
});
export type UpdateFolderInput = z.infer<typeof updateFolderSchema>;

