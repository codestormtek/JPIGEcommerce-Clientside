import { z } from 'zod';

export const listPagesSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  orderBy: z.enum(['displayOrder', 'createdAt', 'title']).default('displayOrder'),
  order: z.enum(['asc', 'desc']).default('asc'),
});

export type ListPagesInput = z.infer<typeof listPagesSchema>;

export const createPageSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  bodyHtml: z.string().default(''),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  headerMediaAssetId: z.string().min(1).nullable().optional(),
  isPublished: z.boolean().default(false),
  passwordProtected: z.boolean().default(false),
  includeInSitemap: z.boolean().default(false),
  includeInTopMenu: z.boolean().default(false),
  includeInFooterColumn1: z.boolean().default(false),
  includeInFooterColumn2: z.boolean().default(false),
  includeInFooterColumn3: z.boolean().default(false),
  displayOrder: z.coerce.number().int().default(0),
});

export type CreatePageInput = z.infer<typeof createPageSchema>;

export const updatePageSchema = createPageSchema.partial();
export type UpdatePageInput = z.infer<typeof updatePageSchema>;
