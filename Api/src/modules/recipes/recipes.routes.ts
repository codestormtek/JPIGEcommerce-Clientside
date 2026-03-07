import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  listRecipesSchema,
  createRecipeSchema,
  updateRecipeSchema,
  ingredientSchema,
  updateIngredientSchema,
  stepSchema,
  updateStepSchema,
  noteSchema,
  updateNoteSchema,
} from './recipes.schema';
import * as ctrl from './recipes.controller';

export const recipesRouter = Router();

// All recipe routes are admin-only (internal tool)
recipesRouter.use(authenticate, authorize('admin'));

// ─── Recipes ──────────────────────────────────────────────────────────────────

// GET    /api/v1/recipes
recipesRouter.get('/', validate(listRecipesSchema, 'query'), asyncHandler(ctrl.listRecipes));

// POST   /api/v1/recipes
recipesRouter.post('/', validate(createRecipeSchema), asyncHandler(ctrl.createRecipe));

// GET    /api/v1/recipes/:id
recipesRouter.get('/:id', asyncHandler(ctrl.getRecipeById));

// PATCH  /api/v1/recipes/:id
recipesRouter.patch('/:id', validate(updateRecipeSchema), asyncHandler(ctrl.updateRecipe));

// DELETE /api/v1/recipes/:id
recipesRouter.delete('/:id', asyncHandler(ctrl.deleteRecipe));

// ─── Ingredients ──────────────────────────────────────────────────────────────

// POST   /api/v1/recipes/:id/ingredients
recipesRouter.post('/:id/ingredients', validate(ingredientSchema), asyncHandler(ctrl.addIngredient));

// PATCH  /api/v1/recipes/:id/ingredients/:itemId
recipesRouter.patch('/:id/ingredients/:itemId', validate(updateIngredientSchema), asyncHandler(ctrl.updateIngredient));

// DELETE /api/v1/recipes/:id/ingredients/:itemId
recipesRouter.delete('/:id/ingredients/:itemId', asyncHandler(ctrl.deleteIngredient));

// ─── Steps ────────────────────────────────────────────────────────────────────

// POST   /api/v1/recipes/:id/steps
recipesRouter.post('/:id/steps', validate(stepSchema), asyncHandler(ctrl.addStep));

// PATCH  /api/v1/recipes/:id/steps/:stepId
recipesRouter.patch('/:id/steps/:stepId', validate(updateStepSchema), asyncHandler(ctrl.updateStep));

// DELETE /api/v1/recipes/:id/steps/:stepId
recipesRouter.delete('/:id/steps/:stepId', asyncHandler(ctrl.deleteStep));

// ─── Notes ────────────────────────────────────────────────────────────────────

// POST   /api/v1/recipes/:id/notes
recipesRouter.post('/:id/notes', validate(noteSchema), asyncHandler(ctrl.addNote));

// PATCH  /api/v1/recipes/:id/notes/:noteId
recipesRouter.patch('/:id/notes/:noteId', validate(updateNoteSchema), asyncHandler(ctrl.updateNote));

// DELETE /api/v1/recipes/:id/notes/:noteId
recipesRouter.delete('/:id/notes/:noteId', asyncHandler(ctrl.deleteNote));

// ─── Nutrition ────────────────────────────────────────────────────────────────

// POST   /api/v1/recipes/:id/nutrition/analyze
recipesRouter.post('/:id/nutrition/analyze', asyncHandler(ctrl.analyzeNutrition));

// GET    /api/v1/recipes/:id/nutrition
recipesRouter.get('/:id/nutrition', asyncHandler(ctrl.getNutrition));

// DELETE /api/v1/recipes/:id/nutrition
recipesRouter.delete('/:id/nutrition', asyncHandler(ctrl.deleteNutrition));

