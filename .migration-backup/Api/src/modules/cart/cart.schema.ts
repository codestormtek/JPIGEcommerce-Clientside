import { z } from 'zod';

// ─── Add item ─────────────────────────────────────────────────────────────────

export const addCartItemSchema = z.object({
  productItemId: z.string().min(1, 'Product item ID is required'),
  qty: z.number().int().positive('Quantity must be at least 1'),
  variationOptionIds: z.array(z.string()).optional(),
});

export type AddCartItemInput = z.infer<typeof addCartItemSchema>;

// ─── Update item qty ──────────────────────────────────────────────────────────

export const updateCartItemSchema = z.object({
  qty: z.number().int().positive('Quantity must be at least 1'),
});

export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;

