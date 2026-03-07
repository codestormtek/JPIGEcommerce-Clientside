import { z } from 'zod';

export const listTasksSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  isEnabled: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  category: z.string().optional(),
  lastStatus: z.string().optional(),
  orderBy: z.enum(['name', 'createdAt', 'lastRunAt', 'nextRunAt']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type ListTasksInput = z.infer<typeof listTasksSchema>;

export const createTaskSchema = z.object({
  name: z.string().min(1).max(200),
  taskKey: z.string().min(1).max(100),
  description: z.string().optional(),
  category: z.string().optional(),
  scheduleType: z.enum(['cron', 'once', 'interval']).default('cron'),
  cronExpression: z.string().optional(),
  intervalSeconds: z.number().int().positive().optional(),
  runOnceAt: z.string().datetime().optional(),
  timezone: z.string().default('UTC'),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
  isEnabled: z.boolean().default(true),
  parametersJson: z.string().optional(),
  retryMaxAttempts: z.number().int().min(0).default(0),
  retryDelaySeconds: z.number().int().min(1).default(60),
  timeoutSeconds: z.number().int().min(1).default(300),
  allowConcurrentRuns: z.boolean().default(false),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  scheduleType: z.enum(['cron', 'once', 'interval']).optional(),
  cronExpression: z.string().optional(),
  intervalSeconds: z.number().int().positive().optional(),
  runOnceAt: z.string().datetime().optional(),
  timezone: z.string().optional(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
  isEnabled: z.boolean().optional(),
  parametersJson: z.string().optional(),
  retryMaxAttempts: z.number().int().min(0).optional(),
  retryDelaySeconds: z.number().int().min(1).optional(),
  timeoutSeconds: z.number().int().min(1).optional(),
  allowConcurrentRuns: z.boolean().optional(),
});

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const runTaskSchema = z.object({
  parametersJson: z.string().optional(),
});

export type RunTaskInput = z.infer<typeof runTaskSchema>;

export const historyQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.string().optional(),
  orderBy: z.enum(['startedAt', 'durationMs']).default('startedAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type HistoryQueryInput = z.infer<typeof historyQuerySchema>;
