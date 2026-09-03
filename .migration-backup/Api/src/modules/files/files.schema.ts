import { z } from 'zod';

// ─── List files ───────────────────────────────────────────────────────────────

export const listFilesSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  mimeType: z.string().optional(),
  uploadedByUserId: z.string().optional(),
});

export type ListFilesInput = z.infer<typeof listFilesSchema>;

// ─── Link a file to an entity ─────────────────────────────────────────────────

export const createFileLinkSchema = z.object({
  entityType: z.enum(['product', 'order', 'user', 'recipe', 'content']),
  entityId: z.string().min(1),
  tag: z.string().optional(),
  displayOrder: z.coerce.number().int().nonnegative().default(0),
});

export type CreateFileLinkInput = z.infer<typeof createFileLinkSchema>;

// ─── List links by entity ─────────────────────────────────────────────────────

export const listByEntitySchema = z.object({
  tag: z.string().optional(),
});

export type ListByEntityInput = z.infer<typeof listByEntitySchema>;

