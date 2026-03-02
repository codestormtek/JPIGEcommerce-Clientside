import { z } from 'zod';

// ─── List Payments (admin) ────────────────────────────────────────────────────

export const listPaymentsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  orderId: z.string().uuid().optional(),
  status: z.enum(['authorized', 'captured', 'failed', 'refunded']).optional(),
  provider: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  orderBy: z.enum(['createdAt', 'amount', 'status']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type ListPaymentsInput = z.infer<typeof listPaymentsSchema>;

