import prisma from '../../lib/prisma';
import {
  ListRecipesInput, CreateRecipeInput, UpdateRecipeInput,
  IngredientInput, UpdateIngredientInput,
  StepInput, UpdateStepInput,
  NoteInput, UpdateNoteInput,
} from './recipes.schema';

type TxClient = Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

const recipeInclude = {
  ingredients: { orderBy: { sortOrder: 'asc' as const } },
  steps: { orderBy: { stepNumber: 'asc' as const } },
  notes: { orderBy: { createdAt: 'asc' as const } },
} as const;

// ─── Recipes ──────────────────────────────────────────────────────────────────

export async function findRecipes(input: ListRecipesInput) {
  const { page, limit, isActive, search, orderBy, order } = input;
  const skip = (page - 1) * limit;
  const where: Record<string, unknown> = {};
  if (isActive !== undefined) where['isActive'] = isActive;
  if (search) where['OR'] = [
    { name: { contains: search, mode: 'insensitive' } },
    { description: { contains: search, mode: 'insensitive' } },
  ];

  const [data, total] = await Promise.all([
    prisma.recipe.findMany({ where, include: recipeInclude, orderBy: { [orderBy]: order }, skip, take: limit }),
    prisma.recipe.count({ where }),
  ]);
  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function findRecipeById(id: string) {
  return prisma.recipe.findUnique({ where: { id }, include: recipeInclude });
}

export async function createRecipe(input: CreateRecipeInput) {
  const { ingredients, steps, notes, ...data } = input;
  return prisma.$transaction(async (tx: TxClient) => {
    const recipe = await tx.recipe.create({ data, include: recipeInclude });
    if (ingredients?.length) {
      await tx.recipeIngredient.createMany({ data: ingredients.map((i) => ({ ...i, recipeId: recipe.id })) });
    }
    if (steps?.length) {
      await tx.recipeStep.createMany({ data: steps.map((s) => ({ ...s, recipeId: recipe.id })) });
    }
    if (notes?.length) {
      await tx.recipeNote.createMany({ data: notes.map((n) => ({ ...n, recipeId: recipe.id })) });
    }
    return tx.recipe.findUnique({ where: { id: recipe.id }, include: recipeInclude });
  });
}

export async function updateRecipe(id: string, input: UpdateRecipeInput) {
  const { ingredients, steps, notes, ...data } = input;
  return prisma.$transaction(async (tx: TxClient) => {
    // Replace child collections only when explicitly provided
    if (ingredients !== undefined) {
      await tx.recipeIngredient.deleteMany({ where: { recipeId: id } });
      if (ingredients.length) await tx.recipeIngredient.createMany({ data: ingredients.map((i) => ({ ...i, recipeId: id })) });
    }
    if (steps !== undefined) {
      await tx.recipeStep.deleteMany({ where: { recipeId: id } });
      if (steps.length) await tx.recipeStep.createMany({ data: steps.map((s) => ({ ...s, recipeId: id })) });
    }
    if (notes !== undefined) {
      await tx.recipeNote.deleteMany({ where: { recipeId: id } });
      if (notes.length) await tx.recipeNote.createMany({ data: notes.map((n) => ({ ...n, recipeId: id })) });
    }
    return tx.recipe.update({ where: { id }, data, include: recipeInclude });
  });
}

export async function deleteRecipe(id: string) {
  return prisma.$transaction(async (tx: TxClient) => {
    await tx.recipeNutrition.deleteMany({ where: { recipeId: id } });
    await tx.recipeIngredient.deleteMany({ where: { recipeId: id } });
    await tx.recipeStep.deleteMany({ where: { recipeId: id } });
    await tx.recipeNote.deleteMany({ where: { recipeId: id } });
    return tx.recipe.delete({ where: { id } });
  });
}

// ─── Individual child mutations ───────────────────────────────────────────────

export async function addIngredient(recipeId: string, input: IngredientInput) {
  return prisma.recipeIngredient.create({ data: { ...input, recipeId } });
}
export async function updateIngredient(id: string, input: UpdateIngredientInput) {
  return prisma.recipeIngredient.update({ where: { id }, data: input });
}
export async function deleteIngredient(id: string) {
  return prisma.recipeIngredient.delete({ where: { id } });
}
export async function findIngredientById(id: string) {
  return prisma.recipeIngredient.findUnique({ where: { id } });
}

export async function addStep(recipeId: string, input: StepInput) {
  return prisma.recipeStep.create({ data: { ...input, recipeId } });
}
export async function updateStep(id: string, input: UpdateStepInput) {
  return prisma.recipeStep.update({ where: { id }, data: input });
}
export async function deleteStep(id: string) {
  return prisma.recipeStep.delete({ where: { id } });
}
export async function findStepById(id: string) {
  return prisma.recipeStep.findUnique({ where: { id } });
}

export async function addNote(recipeId: string, input: NoteInput) {
  return prisma.recipeNote.create({ data: { ...input, recipeId } });
}
export async function updateNote(id: string, input: UpdateNoteInput) {
  return prisma.recipeNote.update({ where: { id }, data: input });
}
export async function deleteNote(id: string) {
  return prisma.recipeNote.delete({ where: { id } });
}
export async function findNoteById(id: string) {
  return prisma.recipeNote.findUnique({ where: { id } });
}

