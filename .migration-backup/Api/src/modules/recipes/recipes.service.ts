import { ApiError } from '../../utils/apiError';
import prisma from '../../lib/prisma';
import {
  ListRecipesInput, CreateRecipeInput, UpdateRecipeInput,
  IngredientInput, UpdateIngredientInput,
  StepInput, UpdateStepInput,
  NoteInput, UpdateNoteInput,
} from './recipes.schema';
import * as repo from './recipes.repository';

// ─── Recipes ──────────────────────────────────────────────────────────────────

export async function listRecipes(input: ListRecipesInput) {
  return repo.findRecipes(input);
}

export async function getRecipeById(id: string) {
  const recipe = await repo.findRecipeById(id);
  if (!recipe) throw ApiError.notFound('Recipe');
  return recipe;
}

export async function createRecipe(input: CreateRecipeInput) {
  return repo.createRecipe(input);
}

export async function updateRecipe(id: string, input: UpdateRecipeInput) {
  await getRecipeById(id);
  return repo.updateRecipe(id, input);
}

export async function deleteRecipe(id: string) {
  await getRecipeById(id);
  return repo.deleteRecipe(id);
}

// ─── Ingredients ──────────────────────────────────────────────────────────────

async function assertIngredientOwnership(recipeId: string, ingredientId: string) {
  const ingredient = await repo.findIngredientById(ingredientId);
  if (!ingredient) throw ApiError.notFound('Ingredient');
  if (ingredient.recipeId !== recipeId) throw ApiError.forbidden('Ingredient does not belong to this recipe');
  return ingredient;
}

export async function addIngredient(recipeId: string, input: IngredientInput) {
  await getRecipeById(recipeId);
  return repo.addIngredient(recipeId, input);
}

export async function updateIngredient(recipeId: string, ingredientId: string, input: UpdateIngredientInput) {
  await getRecipeById(recipeId);
  await assertIngredientOwnership(recipeId, ingredientId);
  return repo.updateIngredient(ingredientId, input);
}

export async function deleteIngredient(recipeId: string, ingredientId: string) {
  await getRecipeById(recipeId);
  await assertIngredientOwnership(recipeId, ingredientId);
  return repo.deleteIngredient(ingredientId);
}

// ─── Steps ────────────────────────────────────────────────────────────────────

async function assertStepOwnership(recipeId: string, stepId: string) {
  const step = await repo.findStepById(stepId);
  if (!step) throw ApiError.notFound('Step');
  if (step.recipeId !== recipeId) throw ApiError.forbidden('Step does not belong to this recipe');
  return step;
}

export async function addStep(recipeId: string, input: StepInput) {
  await getRecipeById(recipeId);
  return repo.addStep(recipeId, input);
}

export async function updateStep(recipeId: string, stepId: string, input: UpdateStepInput) {
  await getRecipeById(recipeId);
  await assertStepOwnership(recipeId, stepId);
  return repo.updateStep(stepId, input);
}

export async function deleteStep(recipeId: string, stepId: string) {
  await getRecipeById(recipeId);
  await assertStepOwnership(recipeId, stepId);
  return repo.deleteStep(stepId);
}

// ─── Notes ────────────────────────────────────────────────────────────────────

async function assertNoteOwnership(recipeId: string, noteId: string) {
  const note = await repo.findNoteById(noteId);
  if (!note) throw ApiError.notFound('Note');
  if (note.recipeId !== recipeId) throw ApiError.forbidden('Note does not belong to this recipe');
  return note;
}

export async function addNote(recipeId: string, input: NoteInput) {
  await getRecipeById(recipeId);
  return repo.addNote(recipeId, input);
}

export async function updateNote(recipeId: string, noteId: string, input: UpdateNoteInput) {
  await getRecipeById(recipeId);
  await assertNoteOwnership(recipeId, noteId);
  return repo.updateNote(noteId, input);
}

export async function deleteNote(recipeId: string, noteId: string) {
  await getRecipeById(recipeId);
  await assertNoteOwnership(recipeId, noteId);
  return repo.deleteNote(noteId);
}

// ─── Recipe–Product Links ────────────────────────────────────────────────────

export async function linkProduct(recipeId: string, productId: string) {
  await getRecipeById(recipeId);
  const product = await prisma.product.findFirst({ where: { id: productId, isDeleted: false } });
  if (!product) throw ApiError.notFound('Product');
  const existing = await prisma.recipeProductMap.findUnique({ where: { recipeId_productId: { recipeId, productId } } });
  if (existing) throw ApiError.conflict('Product is already linked to this recipe');
  return repo.linkProduct(recipeId, productId);
}

export async function unlinkProduct(recipeId: string, productId: string) {
  await getRecipeById(recipeId);
  return repo.unlinkProduct(recipeId, productId);
}

export async function getRecipeProducts(recipeId: string) {
  await getRecipeById(recipeId);
  return repo.findRecipeProducts(recipeId);
}

