import { z } from 'zod';

// ─── Sections ─────────────────────────────────────────────────────────────────

export const createSectionSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  parentId: z.string().uuid().optional().nullable(),
  sortOrder: z.number().int().nonnegative().optional(),
  isPublished: z.boolean().optional(),
});
export type CreateSectionInput = z.infer<typeof createSectionSchema>;

export const updateSectionSchema = createSectionSchema.partial();
export type UpdateSectionInput = z.infer<typeof updateSectionSchema>;

export const reorderSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});
export type ReorderInput = z.infer<typeof reorderSchema>;

// ─── Blocks ───────────────────────────────────────────────────────────────────

export const BLOCK_TYPES = ['text', 'steps', 'tip', 'warning', 'image'] as const;

export const createBlockSchema = z.object({
  type: z.enum(BLOCK_TYPES).default('text'),
  title: z.string().optional().nullable(),
  body: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  imageCaption: z.string().optional().nullable(),
  sortOrder: z.number().int().nonnegative().optional(),
});
export type CreateBlockInput = z.infer<typeof createBlockSchema>;

export const updateBlockSchema = createBlockSchema.partial();
export type UpdateBlockInput = z.infer<typeof updateBlockSchema>;

// ─── Steps ────────────────────────────────────────────────────────────────────

export const createStepSchema = z.object({
  text: z.string().min(1, 'Step text is required'),
  imageUrl: z.string().optional().nullable(),
  imageCaption: z.string().optional().nullable(),
  sortOrder: z.number().int().nonnegative().optional(),
});
export type CreateStepInput = z.infer<typeof createStepSchema>;

export const updateStepSchema = createStepSchema.partial();
export type UpdateStepInput = z.infer<typeof updateStepSchema>;
