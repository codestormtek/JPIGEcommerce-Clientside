import { Request, Response } from 'express';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from '../../utils/apiResponse';
import {
  ListRecipesInput, CreateRecipeInput, UpdateRecipeInput,
  IngredientInput, UpdateIngredientInput,
  StepInput, UpdateStepInput,
  NoteInput, UpdateNoteInput,
} from './recipes.schema';
import * as service from './recipes.service';

// ─── Recipes ──────────────────────────────────────────────────────────────────

// GET /api/v1/recipes
export async function listRecipes(req: Request, res: Response): Promise<void> {
  const result = await service.listRecipes(req.query as unknown as ListRecipesInput);
  sendPaginated(res, result);
}

// GET /api/v1/recipes/:id
export async function getRecipeById(req: Request, res: Response): Promise<void> {
  const recipe = await service.getRecipeById(req.params['id'] as string);
  sendSuccess(res, recipe);
}

// POST /api/v1/recipes
export async function createRecipe(req: Request, res: Response): Promise<void> {
  const recipe = await service.createRecipe(req.body as CreateRecipeInput);
  sendCreated(res, recipe, 'Recipe created');
}

// PATCH /api/v1/recipes/:id
export async function updateRecipe(req: Request, res: Response): Promise<void> {
  const recipe = await service.updateRecipe(req.params['id'] as string, req.body as UpdateRecipeInput);
  sendSuccess(res, recipe, 'Recipe updated');
}

// DELETE /api/v1/recipes/:id
export async function deleteRecipe(req: Request, res: Response): Promise<void> {
  await service.deleteRecipe(req.params['id'] as string);
  sendNoContent(res);
}

// ─── Ingredients ──────────────────────────────────────────────────────────────

// POST /api/v1/recipes/:id/ingredients
export async function addIngredient(req: Request, res: Response): Promise<void> {
  const item = await service.addIngredient(req.params['id'] as string, req.body as IngredientInput);
  sendCreated(res, item, 'Ingredient added');
}

// PATCH /api/v1/recipes/:id/ingredients/:itemId
export async function updateIngredient(req: Request, res: Response): Promise<void> {
  const item = await service.updateIngredient(req.params['id'] as string, req.params['itemId'] as string, req.body as UpdateIngredientInput);
  sendSuccess(res, item, 'Ingredient updated');
}

// DELETE /api/v1/recipes/:id/ingredients/:itemId
export async function deleteIngredient(req: Request, res: Response): Promise<void> {
  await service.deleteIngredient(req.params['id'] as string, req.params['itemId'] as string);
  sendNoContent(res);
}

// ─── Steps ────────────────────────────────────────────────────────────────────

// POST /api/v1/recipes/:id/steps
export async function addStep(req: Request, res: Response): Promise<void> {
  const step = await service.addStep(req.params['id'] as string, req.body as StepInput);
  sendCreated(res, step, 'Step added');
}

// PATCH /api/v1/recipes/:id/steps/:stepId
export async function updateStep(req: Request, res: Response): Promise<void> {
  const step = await service.updateStep(req.params['id'] as string, req.params['stepId'] as string, req.body as UpdateStepInput);
  sendSuccess(res, step, 'Step updated');
}

// DELETE /api/v1/recipes/:id/steps/:stepId
export async function deleteStep(req: Request, res: Response): Promise<void> {
  await service.deleteStep(req.params['id'] as string, req.params['stepId'] as string);
  sendNoContent(res);
}

// ─── Notes ────────────────────────────────────────────────────────────────────

// POST /api/v1/recipes/:id/notes
export async function addNote(req: Request, res: Response): Promise<void> {
  const note = await service.addNote(req.params['id'] as string, req.body as NoteInput);
  sendCreated(res, note, 'Note added');
}

// PATCH /api/v1/recipes/:id/notes/:noteId
export async function updateNote(req: Request, res: Response): Promise<void> {
  const note = await service.updateNote(req.params['id'] as string, req.params['noteId'] as string, req.body as UpdateNoteInput);
  sendSuccess(res, note, 'Note updated');
}

// DELETE /api/v1/recipes/:id/notes/:noteId
export async function deleteNote(req: Request, res: Response): Promise<void> {
  await service.deleteNote(req.params['id'] as string, req.params['noteId'] as string);
  sendNoContent(res);
}

