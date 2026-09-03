import { z } from 'zod';

export const listGalleriesSchema = z.object({
  page:      z.coerce.number().int().positive().default(1),
  limit:     z.coerce.number().int().positive().max(100).default(20),
  isVisible: z.coerce.boolean().optional(),
  orderBy:   z.enum(['displayOrder', 'createdAt']).default('displayOrder'),
  order:     z.enum(['asc', 'desc']).default('asc'),
});

export type ListGalleriesInput = z.infer<typeof listGalleriesSchema>;

export const createGallerySchema = z.object({
  name:         z.string().min(1),
  slug:         z.string().min(1),
  description:  z.string().optional(),
  isVisible:    z.boolean().default(true),
  displayOrder: z.number().int().nonnegative().default(0),
});

export type CreateGalleryInput = z.infer<typeof createGallerySchema>;

export const updateGallerySchema = createGallerySchema.partial();
export type UpdateGalleryInput = z.infer<typeof updateGallerySchema>;

export const addGalleryImageSchema = z.object({
  mediaAssetId: z.string().uuid(),
  title:        z.string().optional(),
  description:  z.string().optional(),
  sortOrder:    z.number().int().nonnegative().default(0),
});

export type AddGalleryImageInput = z.infer<typeof addGalleryImageSchema>;

export const updateGalleryImageSchema = z.object({
  title:       z.string().optional(),
  description: z.string().optional(),
  sortOrder:   z.number().int().nonnegative().optional(),
});

export type UpdateGalleryImageInput = z.infer<typeof updateGalleryImageSchema>;
