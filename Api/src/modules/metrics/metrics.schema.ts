import { z } from 'zod';

// Supported short-hand ranges for the summary endpoint
export const summaryRangeSchema = z.enum(['today', '7d', '30d']).default('7d');

export const summaryQuerySchema = z.object({
  range: summaryRangeSchema,
});

export const timeseriesQuerySchema = z.object({
  metricKey: z.string().min(1),
  from: z.string().datetime({ message: 'from must be an ISO datetime string' }),
  to: z.string().datetime({ message: 'to must be an ISO datetime string' }),
  currency: z.string().optional(),
  channel: z.string().optional(),
});

export const topProductsQuerySchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? Math.min(parseInt(v, 10), 50) : 10)),
});

export type SummaryQuery = z.infer<typeof summaryQuerySchema>;
export type TimeseriesQuery = z.infer<typeof timeseriesQuerySchema>;
export type TopProductsQuery = z.infer<typeof topProductsQuerySchema>;

