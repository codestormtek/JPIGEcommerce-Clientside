import { z } from 'zod';

// ─── Create export job ────────────────────────────────────────────────────────

export const createExportSchema = z.object({
  resource: z.enum(['orders', 'products', 'users', 'promotions']),
  format: z.enum(['csv', 'xlsx', 'pdf', 'txt']),
  /** Optional key/value pairs that map to resource-specific WHERE filters. */
  filters: z.record(z.string()).optional(),
});

export type CreateExportInput = z.infer<typeof createExportSchema>;

// ─── List export jobs ─────────────────────────────────────────────────────────

export const listExportsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  resource: z.enum(['orders', 'products', 'users', 'promotions']).optional(),
  status: z.enum(['queued', 'processing', 'done', 'failed']).optional(),
});

export type ListExportsInput = z.infer<typeof listExportsSchema>;

