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

export const staffPaymentsListSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['pending', 'captured', 'failed', 'canceled', 'refunded', 'partially_refunded']).optional(),
  search: z.string().trim().max(100).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export const paymentIdSchema = z.object({ paymentId: z.string().uuid() });

export const createStaffRefundSchema = z.object({
  requestId: z.string().uuid(),
  reason: z.string().trim().min(3).max(192),
  amountCents: z.number().int().positive(),
  restoreInventory: z.boolean(),
});

export type StaffPaymentsListInput = z.infer<typeof staffPaymentsListSchema>;
export type CreateStaffRefundInput = z.infer<typeof createStaffRefundSchema>;

