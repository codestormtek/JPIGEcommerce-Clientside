import { z } from 'zod';

// ─── List media ───────────────────────────────────────────────────────────────

// Folder keys map to upload sub-directories:  products | avatars | carousel | blog | news | topics | categories | media
export const MEDIA_FOLDERS = ['products', 'avatars', 'carousel', 'blog', 'news', 'topics', 'pages', 'categories', 'galleries', 'media', 'widgets'] as const;
export type MediaFolder = (typeof MEDIA_FOLDERS)[number];

export const listMediaSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  mediaType: z.enum(['image', 'video']).optional(),
  folder: z.enum(MEDIA_FOLDERS).optional(),
  orderBy: z.enum(['createdAt', 'url']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type ListMediaInput = z.infer<typeof listMediaSchema>;

// ─── Create media asset ────────────────────────────────────────────────────────

export const createMediaSchema = z.object({
  url: z.string().url('Must be a valid URL'),
  altText: z.string().optional(),
  mediaType: z.enum(['image', 'video']).default('image'),
  metadata: z
    .object({
      mimeType: z.string().optional(),
      fileSizeBytes: z.coerce.number().int().nonnegative().optional(),
      widthPx: z.number().int().nonnegative().optional(),
      heightPx: z.number().int().nonnegative().optional(),
      checksumSha256: z.string().optional(),
    })
    .optional(),
});

export type CreateMediaInput = z.infer<typeof createMediaSchema>;

// ─── Update media asset ────────────────────────────────────────────────────────

export const updateMediaSchema = createMediaSchema.partial();
export type UpdateMediaInput = z.infer<typeof updateMediaSchema>;

