import { z } from 'zod';

// ─── List recipes ─────────────────────────────────────────────────────────────

export const listRecipesSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  isActive: z.coerce.boolean().optional(),
  search: z.string().optional(),
  orderBy: z.enum(['name', 'createdAt', 'category']).default('name'),
  order: z.enum(['asc', 'desc']).default('asc'),
});

export type ListRecipesInput = z.infer<typeof listRecipesSchema>;

// ─── Ingredient ───────────────────────────────────────────────────────────────

export const ingredientSchema = z.object({
  ingredientName: z.string().min(1, 'Ingredient name is required'),
  quantity: z.number().positive('Quantity must be positive'),
  unit: z.string().default('each'),
  sortOrder: z.number().int().nonnegative().default(0),
});

export type IngredientInput = z.infer<typeof ingredientSchema>;

// ─── Step ─────────────────────────────────────────────────────────────────────

export const stepSchema = z.object({
  stepNumber: z.number().int().positive('Step number must be positive'),
  instruction: z.string().min(1, 'Instruction is required'),
});

export type StepInput = z.infer<typeof stepSchema>;

// ─── Note ─────────────────────────────────────────────────────────────────────

export const noteSchema = z.object({
  note: z.string().min(1, 'Note is required'),
});

export type NoteInput = z.infer<typeof noteSchema>;

// ─── Create / Update recipe ───────────────────────────────────────────────────

export const createRecipeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  prepTimeMinutes: z.number().int().nonnegative().optional(),
  cookTimeMinutes: z.number().int().nonnegative().optional(),
  servings: z.number().int().positive().optional(),
  category: z.string().optional(),
  tags: z.string().optional(),
  ingredients: z.array(ingredientSchema).optional(),
  steps: z.array(stepSchema).optional(),
  notes: z.array(noteSchema).optional(),
});

export type CreateRecipeInput = z.infer<typeof createRecipeSchema>;

export const updateRecipeSchema = createRecipeSchema.partial();
export type UpdateRecipeInput = z.infer<typeof updateRecipeSchema>;

// ─── Individual child schemas (for nested routes) ─────────────────────────────

export const updateIngredientSchema = ingredientSchema.partial();
export type UpdateIngredientInput = z.infer<typeof updateIngredientSchema>;

export const updateStepSchema = stepSchema.partial();
export type UpdateStepInput = z.infer<typeof updateStepSchema>;

export const updateNoteSchema = noteSchema.partial();
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;

