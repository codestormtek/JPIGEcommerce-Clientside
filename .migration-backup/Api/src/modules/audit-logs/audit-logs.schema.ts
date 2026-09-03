import { z } from 'zod';

// ─── List Audit Logs ───────────────────────────────────────────────────────────

export const listAuditLogsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  userId: z.string().uuid().optional(),
  action: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  orderBy: z.enum(['createdAt', 'action', 'entityType']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type ListAuditLogsInput = z.infer<typeof listAuditLogsSchema>;

