import { z } from 'zod';

// ─── List / filter ────────────────────────────────────────────────────────────

export const listProductsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  brandId: z.string().min(1).optional(),
  categoryId: z.string().min(1).optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  orderBy: z.enum(['createdAt', 'name', 'price']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type ListProductsInput = z.infer<typeof listProductsSchema>;

// ─── Create product (admin) ───────────────────────────────────────────────────

export const createProductSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  price: z.number().nonnegative('Price must be ≥ 0'),
  quantity: z.number().int().nonnegative().default(0),
  brandId: z.string().min(1).optional(),
  categoryIds: z.array(z.string().min(1)).optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

// ─── Update product (admin) ───────────────────────────────────────────────────

export const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  price: z.number().nonnegative().optional(),
  quantity: z.number().int().nonnegative().optional(),
  brandId: z.string().min(1).optional().nullable(),
  categoryIds: z.array(z.string().min(1)).optional(),
});

export type UpdateProductInput = z.infer<typeof updateProductSchema>;

// ─── ProductItem (SKU) ────────────────────────────────────────────────────────

export const createProductItemSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  barcode: z.string().optional(),
  price: z.number().nonnegative(),
  qtyInStock: z.number().int().nonnegative().default(0),
  weight: z.number().nonnegative().optional(),
  length: z.number().nonnegative().optional(),
  width: z.number().nonnegative().optional(),
  height: z.number().nonnegative().optional(),
  isPublished: z.boolean().default(true),
});

export type CreateProductItemInput = z.infer<typeof createProductItemSchema>;

export const updateProductItemSchema = createProductItemSchema.partial();
export type UpdateProductItemInput = z.infer<typeof updateProductItemSchema>;

// ─── ProductAttribute ─────────────────────────────────────────────────────────

export const createProductAttributeSchema = z.object({
  name: z.string().min(1, 'Attribute name is required'),
  values: z
    .array(
      z.object({
        value: z.string().min(1, 'Value is required'),
        priceAdjustment: z.number().optional(),
      }),
    )
    .optional()
    .default([]),
});

export type CreateProductAttributeInput = z.infer<typeof createProductAttributeSchema>;

// ─── Brand ────────────────────────────────────────────────────────────────────

export const createBrandSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
});

export type CreateBrandInput = z.infer<typeof createBrandSchema>;
export const updateBrandSchema = createBrandSchema.partial();
export type UpdateBrandInput = z.infer<typeof updateBrandSchema>;

// ─── Category ─────────────────────────────────────────────────────────────────

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  parentCategoryId: z.string().min(1).optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export const updateCategorySchema = createCategorySchema.partial().extend({
  parentCategoryId: z.string().min(1).nullable().optional(),
});
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

