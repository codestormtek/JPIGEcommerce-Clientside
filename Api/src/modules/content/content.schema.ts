import { z } from 'zod';

// ─── List posts ────────────────────────────────────────────────────────────────

export const listPostsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  postType: z.enum(['blog', 'news']).optional(),
  status: z.enum(['draft', 'scheduled', 'published', 'archived']).optional(),
  categoryId: z.string().uuid().optional(),
  tagId: z.string().uuid().optional(),
  search: z.string().optional(),
  orderBy: z.enum(['publishedAt', 'createdAt', 'title']).default('publishedAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type ListPostsInput = z.infer<typeof listPostsSchema>;

// ─── Create / Update post ──────────────────────────────────────────────────────

export const createPostSchema = z.object({
  postType: z.enum(['blog', 'news']),
  title: z.string().min(1, 'Title is required'),
  slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  excerpt: z.string().optional(),
  bodyHtml: z.string().min(1, 'Body is required'),
  status: z.enum(['draft', 'scheduled', 'published', 'archived']).default('draft'),
  featuredMediaAssetId: z.string().uuid().optional(),
  publishedAt: z.coerce.date().optional(),
  categoryIds: z.array(z.string().uuid()).optional(),
  tagIds: z.array(z.string().uuid()).optional(),
  mediaAssetIds: z.array(z.string().uuid()).optional(),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;

export const updatePostSchema = createPostSchema.partial();
export type UpdatePostInput = z.infer<typeof updatePostSchema>;

// ─── Categories ────────────────────────────────────────────────────────────────

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export const updateCategorySchema = createCategorySchema.partial();
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

// ─── Tags ──────────────────────────────────────────────────────────────────────

export const createTagSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
});

export type CreateTagInput = z.infer<typeof createTagSchema>;
export const updateTagSchema = createTagSchema.partial();
export type UpdateTagInput = z.infer<typeof updateTagSchema>;

