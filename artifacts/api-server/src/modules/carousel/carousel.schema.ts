import { z } from 'zod';

// ─── List slides ──────────────────────────────────────────────────────────────

export const listSlidesSchema = z.object({
  page:        z.coerce.number().int().positive().default(1),
  limit:       z.coerce.number().int().positive().max(100).default(20),
  isVisible:   z.coerce.boolean().optional(),
  orderBy:     z.enum(['displayOrder', 'createdAt']).default('displayOrder'),
  order:       z.enum(['asc', 'desc']).default('asc'),
});

export type ListSlidesInput = z.infer<typeof listSlidesSchema>;

// ─── Create slide ─────────────────────────────────────────────────────────────

export const createSlideSchema = z.object({
  title:              z.string().optional(),
  subTitle:           z.string().optional(),
  displayOrder:       z.number().int().nonnegative().default(0),
  isVisible:          z.boolean().default(true),
  mediaAssetId:       z.string().uuid().optional(),
  mobileMediaAssetId: z.string().uuid().optional(),
  buttonText:         z.string().optional(),
  buttonUrl:          z.string().optional(),
});

export type CreateSlideInput = z.infer<typeof createSlideSchema>;

// ─── Update slide ─────────────────────────────────────────────────────────────

export const updateSlideSchema = createSlideSchema.partial();
export type UpdateSlideInput = z.infer<typeof updateSlideSchema>;

