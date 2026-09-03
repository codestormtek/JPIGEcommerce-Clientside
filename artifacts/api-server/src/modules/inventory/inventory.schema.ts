import { z } from 'zod';

// ─── List / filter ────────────────────────────────────────────────────────────

export const listInventorySchema = z.object({
  page:      z.coerce.number().int().positive().default(1),
  limit:     z.coerce.number().int().positive().max(100).default(20),
  search:    z.string().optional(),          // searches SKU or product name
  productId: z.string().uuid().optional(),
  lowStock:  z.coerce.boolean().optional(), // filter items where qtyInStock <= threshold
  threshold: z.coerce.number().int().nonnegative().default(5),
  orderBy:   z.enum(['sku', 'qtyInStock', 'price', 'createdAt']).default('sku'),
  order:     z.enum(['asc', 'desc']).default('asc'),
});

export type ListInventoryInput = z.infer<typeof listInventorySchema>;

// ─── Create (admin) ───────────────────────────────────────────────────────────

export const createInventoryItemSchema = z.object({
  productId:  z.string().uuid('productId must be a valid UUID'),
  sku:        z.string().min(1, 'SKU is required'),
  barcode:    z.string().optional(),
  price:      z.number().nonnegative('Price must be ≥ 0'),
  qtyInStock: z.number().int().nonnegative().default(0),
  weight:     z.number().nonnegative().optional(),
  length:     z.number().nonnegative().optional(),
  width:      z.number().nonnegative().optional(),
  height:     z.number().nonnegative().optional(),
  isPublished: z.boolean().default(true),
});

export type CreateInventoryItemInput = z.infer<typeof createInventoryItemSchema>;

// ─── Update (admin) ───────────────────────────────────────────────────────────

export const updateInventoryItemSchema = createInventoryItemSchema
  .omit({ productId: true })
  .partial();

export type UpdateInventoryItemInput = z.infer<typeof updateInventoryItemSchema>;

