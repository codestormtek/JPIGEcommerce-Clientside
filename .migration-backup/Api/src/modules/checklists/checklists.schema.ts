import { z } from 'zod';

// ─── List ─────────────────────────────────────────────────────────────────────

export const listChecklistsSchema = z.object({
  page:    z.coerce.number().int().positive().default(1),
  limit:   z.coerce.number().int().positive().max(100).default(50),
  search:  z.string().optional(),
  orderBy: z.enum(['name', 'createdAt', 'updatedAt']).default('updatedAt'),
  order:   z.enum(['asc', 'desc']).default('desc'),
});

export type ListChecklistsInput = z.infer<typeof listChecklistsSchema>;

// ─── Create Checklist ─────────────────────────────────────────────────────────

export const createChecklistSchema = z.object({
  name: z.string().min(1).max(200).default('Untitled List'),
});

export type CreateChecklistInput = z.infer<typeof createChecklistSchema>;

// ─── Update Checklist ─────────────────────────────────────────────────────────

export const updateChecklistSchema = z.object({
  name: z.string().min(1).max(200).optional(),
});

export type UpdateChecklistInput = z.infer<typeof updateChecklistSchema>;

// ─── Task ─────────────────────────────────────────────────────────────────────

export const createTaskSchema = z.object({
  text:     z.string().max(1000).default(''),
  done:     z.boolean().default(false),
  position: z.number().int().nonnegative().default(0),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = createTaskSchema.partial();

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

// ─── Bulk-reorder tasks ───────────────────────────────────────────────────────

export const reorderTasksSchema = z.object({
  // Array of { id, position } pairs
  tasks: z.array(z.object({ id: z.string().uuid(), position: z.number().int().nonnegative() })),
});

export type ReorderTasksInput = z.infer<typeof reorderTasksSchema>;

// ─── Bulk-sync (full checklist state from localStorage) ───────────────────────

export const syncChecklistSchema = z.object({
  name:  z.string().min(1).max(200),
  tasks: z.array(
    z.object({
      id:       z.string().uuid().optional(), // omit for new tasks
      text:     z.string().max(1000).default(''),
      done:     z.boolean().default(false),
      position: z.number().int().nonnegative(),
    }),
  ),
});

export type SyncChecklistInput = z.infer<typeof syncChecklistSchema>;

