import { z } from 'zod';

// ─── List menus ───────────────────────────────────────────────────────────────

export const listMenusSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  menuType: z.enum(['catering', 'truck', 'event']).optional(),
  isActive: z.coerce.boolean().optional(),
  orderBy: z.enum(['name', 'startDate', 'endDate']).default('name'),
  order: z.enum(['asc', 'desc']).default('asc'),
});

export type ListMenusInput = z.infer<typeof listMenusSchema>;

// ─── Create / Update Menu ─────────────────────────────────────────────────────

export const createMenuSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  menuType: z.enum(['catering', 'truck', 'event']).default('catering'),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  layout: z.enum(['1col', '2col']).default('2col'),
  theme: z.enum(['default', 'dark', 'light', 'warm', 'cool']).default('default'),
});

export type CreateMenuInput = z.infer<typeof createMenuSchema>;

export const updateMenuSchema = createMenuSchema.partial();
export type UpdateMenuInput = z.infer<typeof updateMenuSchema>;

// ─── Publish Menu ─────────────────────────────────────────────────────────────

export const publishMenuSchema = z.object({
  publishedBy: z.string().optional(),
});

export type PublishMenuInput = z.infer<typeof publishMenuSchema>;

// ─── Sections ─────────────────────────────────────────────────────────────────

export const createSectionSchema = z.object({
  name: z.string().min(1, 'Section name is required'),
  icon: z.string().optional(),
  displayOrder: z.number().int().nonnegative().default(0),
});

export type CreateSectionInput = z.infer<typeof createSectionSchema>;

export const updateSectionSchema = createSectionSchema.partial();
export type UpdateSectionInput = z.infer<typeof updateSectionSchema>;

// ─── Reorder section items ────────────────────────────────────────────────────

export const reorderSectionItemsSchema = z.object({
  items: z.array(z.object({
    menuItemId: z.string().uuid(),
    displayOrder: z.number().int().nonnegative(),
  })),
});

export type ReorderSectionItemsInput = z.infer<typeof reorderSectionItemsSchema>;

// ─── Section Item assignment ──────────────────────────────────────────────────

export const addSectionItemSchema = z.object({
  menuItemId: z.string().uuid('Invalid menu item ID'),
  displayOrder: z.number().int().nonnegative().default(0),
  priceOverride: z.number().nonnegative().optional(),
});

export type AddSectionItemInput = z.infer<typeof addSectionItemSchema>;

// ─── Update section item ──────────────────────────────────────────────────────

export const updateSectionItemSchema = z.object({
  priceOverride: z.number().nonnegative().nullable().optional(),
  displayOrder: z.number().int().nonnegative().optional(),
});

export type UpdateSectionItemInput = z.infer<typeof updateSectionItemSchema>;

// ─── Menu Items ───────────────────────────────────────────────────────────────

export const listMenuItemsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  isActive: z.coerce.boolean().optional(),
  pricingModel: z.enum(['each', 'per_person', 'tray', 'market']).optional(),
  orderBy: z.enum(['name', 'basePrice', 'createdAt']).default('name'),
  order: z.enum(['asc', 'desc']).default('asc'),
});

export type ListMenuItemsInput = z.infer<typeof listMenuItemsSchema>;

export const createMenuItemSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  pricingModel: z.enum(['each', 'per_person', 'tray', 'market']),
  basePrice: z.number().nonnegative().optional(),
  mediaAssetId: z.string().uuid().optional(),
  prepTimeMinutes: z.number().int().nonnegative().optional(),
});

export type CreateMenuItemInput = z.infer<typeof createMenuItemSchema>;

export const updateMenuItemSchema = createMenuItemSchema.partial();
export type UpdateMenuItemInput = z.infer<typeof updateMenuItemSchema>;


