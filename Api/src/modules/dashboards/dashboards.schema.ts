import { z } from 'zod';

// ─── Dashboard CRUD ──────────────────────────────────────────────────────────

export const createDashboardSchema = z.object({
  name: z.string().min(1).max(100),
  scope: z.enum(['USER', 'STORE', 'GLOBAL']).default('USER'),
  isDefault: z.boolean().default(false),
});

export const updateDashboardSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

// ─── Widget CRUD ─────────────────────────────────────────────────────────────

export const createWidgetSchema = z.object({
  title: z.string().min(1).max(100),
  type: z.enum(['KPI', 'TIMESERIES', 'PIE', 'BAR', 'TABLE']),
  x: z.number().int().min(0).default(0),
  y: z.number().int().min(0).default(0),
  w: z.number().int().min(1).max(12).default(4),
  h: z.number().int().min(1).max(12).default(2),
  metricKey: z.string().min(1).optional(),
  source: z.enum(['LIVE', 'DAILY', 'AUTO']).default('AUTO'),
  configJson: z.record(z.unknown()).default({}),
});

export const updateWidgetSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  x: z.number().int().min(0).optional(),
  y: z.number().int().min(0).optional(),
  w: z.number().int().min(1).max(12).optional(),
  h: z.number().int().min(1).max(12).optional(),
  metricKey: z.string().min(1).optional(),
  source: z.enum(['LIVE', 'DAILY', 'AUTO']).optional(),
  configJson: z.record(z.unknown()).optional(),
});

export type CreateDashboardInput = z.infer<typeof createDashboardSchema>;
export type UpdateDashboardInput = z.infer<typeof updateDashboardSchema>;
export type CreateWidgetInput = z.infer<typeof createWidgetSchema>;
export type UpdateWidgetInput = z.infer<typeof updateWidgetSchema>;

