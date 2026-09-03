import { z } from 'zod';

// ─── List promotions ──────────────────────────────────────────────────────────

export const listPromotionsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  promotionType: z.enum(['percent', 'fixed', 'free_shipping']).optional(),
  isActive: z.coerce.boolean().optional(),
  orderBy: z.enum(['name', 'startDate', 'endDate']).default('name'),
  order: z.enum(['asc', 'desc']).default('asc'),
});

export type ListPromotionsInput = z.infer<typeof listPromotionsSchema>;

// ─── Create / Update promotion ────────────────────────────────────────────────

export const createPromotionSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  promotionType: z.enum(['percent', 'fixed', 'free_shipping']),
  discountRate: z.number().nonnegative().optional(),
  minSubtotal: z.number().nonnegative().optional(),
  stackable: z.boolean().default(false),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  isActive: z.boolean().default(true),
  categoryIds: z.array(z.string().min(1)).optional(),
  productIds: z.array(z.string().min(1)).optional(),
});

export type CreatePromotionInput = z.infer<typeof createPromotionSchema>;

export const updatePromotionSchema = createPromotionSchema.partial();
export type UpdatePromotionInput = z.infer<typeof updatePromotionSchema>;

// ─── Coupons ─────────────────────────────────────────────────────────────────

export const createCouponSchema = z.object({
  code: z.string().min(1, 'Coupon code is required').toUpperCase(),
  discountAmount: z.number().nonnegative(),
  percentage: z.number().min(0).max(100).optional(),
  expirationDate: z.coerce.date().optional(),
  usageLimit: z.number().int().positive().optional(),
});

export type CreateCouponInput = z.infer<typeof createCouponSchema>;

// ─── Validate coupon ──────────────────────────────────────────────────────────

export const validateCouponSchema = z.object({
  code: z.string().min(1, 'Coupon code is required'),
  subtotal: z.number().nonnegative().optional(),
});

export type ValidateCouponInput = z.infer<typeof validateCouponSchema>;

// ─── List promotion usages (admin) ────────────────────────────────────────────

export const listPromotionUsagesSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type ListPromotionUsagesInput = z.infer<typeof listPromotionUsagesSchema>;

