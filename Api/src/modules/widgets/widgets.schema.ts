import { z } from 'zod';

export const listWidgetsSchema = z.object({
  page:     z.coerce.number().int().positive().default(1),
  limit:    z.coerce.number().int().positive().max(100).default(20),
  orderBy:  z.enum(['displayOrder', 'createdAt', 'name']).default('displayOrder'),
  order:    z.enum(['asc', 'desc']).default('asc'),
});
export type ListWidgetsInput = z.infer<typeof listWidgetsSchema>;

export const createWidgetSchema = z.object({
  name:         z.string().min(1),
  placement:    z.string().min(1).regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, and hyphens only'),
  description:  z.string().optional(),
  columns:      z.number().int().min(1).max(6).default(4),
  isVisible:    z.boolean().default(true),
  displayOrder: z.number().int().nonnegative().default(0),
});
export type CreateWidgetInput = z.infer<typeof createWidgetSchema>;

export const updateWidgetSchema = createWidgetSchema.omit({ placement: true }).partial();
export type UpdateWidgetInput = z.infer<typeof updateWidgetSchema>;

export const createWidgetItemSchema = z.object({
  title:           z.string().optional(),
  subtitle:        z.string().optional(),
  badge:           z.string().optional(),
  buttonText:      z.string().optional(),
  buttonUrl:       z.string().optional(),
  backgroundColor: z.string().optional(),
  sortOrder:       z.number().int().nonnegative().default(0),
  isVisible:       z.boolean().default(true),
  mediaAssetId:    z.string().uuid().optional().nullable(),
  imageWidth:      z.number().int().positive().optional().nullable(),
  imageHeight:     z.number().int().positive().optional().nullable(),
});
export type CreateWidgetItemInput = z.infer<typeof createWidgetItemSchema>;

export const updateWidgetItemSchema = createWidgetItemSchema.partial();
export type UpdateWidgetItemInput = z.infer<typeof updateWidgetItemSchema>;
