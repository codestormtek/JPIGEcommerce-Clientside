import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  listMenusSchema,
  createMenuSchema,
  updateMenuSchema,
  createSectionSchema,
  updateSectionSchema,
  addSectionItemSchema,
  listMenuItemsSchema,
  createMenuItemSchema,
  updateMenuItemSchema,
} from './menus.schema';
import * as ctrl from './menus.controller';

export const menusRouter = Router();

// ─── Static prefix routes (must be before /:id) ───────────────────────────────

// GET    /api/v1/menus/items          — list all menu items (public)
menusRouter.get('/items', validate(listMenuItemsSchema, 'query'), asyncHandler(ctrl.listMenuItems));

// POST   /api/v1/menus/items          — create menu item (admin)
menusRouter.post('/items', authenticate, authorize('admin'), validate(createMenuItemSchema), asyncHandler(ctrl.createMenuItem));

// GET    /api/v1/menus/items/:itemId  — get single menu item (public)
menusRouter.get('/items/:itemId', asyncHandler(ctrl.getMenuItemById));

// PATCH  /api/v1/menus/items/:itemId  — update menu item (admin)
menusRouter.patch('/items/:itemId', authenticate, authorize('admin'), validate(updateMenuItemSchema), asyncHandler(ctrl.updateMenuItem));

// DELETE /api/v1/menus/items/:itemId  — delete menu item (admin)
menusRouter.delete('/items/:itemId', authenticate, authorize('admin'), asyncHandler(ctrl.deleteMenuItem));

// ─── Menu CRUD ────────────────────────────────────────────────────────────────

// GET    /api/v1/menus                — list menus (public)
menusRouter.get('/', validate(listMenusSchema, 'query'), asyncHandler(ctrl.listMenus));

// POST   /api/v1/menus                — create menu (admin)
menusRouter.post('/', authenticate, authorize('admin'), validate(createMenuSchema), asyncHandler(ctrl.createMenu));

// GET    /api/v1/menus/:id            — get menu with sections (public)
menusRouter.get('/:id', asyncHandler(ctrl.getMenuById));

// PATCH  /api/v1/menus/:id            — update menu (admin)
menusRouter.patch('/:id', authenticate, authorize('admin'), validate(updateMenuSchema), asyncHandler(ctrl.updateMenu));

// DELETE /api/v1/menus/:id            — delete menu (admin)
menusRouter.delete('/:id', authenticate, authorize('admin'), asyncHandler(ctrl.deleteMenu));

// ─── Sections (nested under menu) ────────────────────────────────────────────

// POST   /api/v1/menus/:id/sections
menusRouter.post('/:id/sections', authenticate, authorize('admin'), validate(createSectionSchema), asyncHandler(ctrl.addSection));

// PATCH  /api/v1/menus/:id/sections/:sectionId
menusRouter.patch('/:id/sections/:sectionId', authenticate, authorize('admin'), validate(updateSectionSchema), asyncHandler(ctrl.updateSection));

// DELETE /api/v1/menus/:id/sections/:sectionId
menusRouter.delete('/:id/sections/:sectionId', authenticate, authorize('admin'), asyncHandler(ctrl.deleteSection));

// ─── Section items ────────────────────────────────────────────────────────────

// POST   /api/v1/menus/:id/sections/:sectionId/items
menusRouter.post('/:id/sections/:sectionId/items', authenticate, authorize('admin'), validate(addSectionItemSchema), asyncHandler(ctrl.addItemToSection));

// DELETE /api/v1/menus/:id/sections/:sectionId/items/:menuItemId
menusRouter.delete('/:id/sections/:sectionId/items/:menuItemId', authenticate, authorize('admin'), asyncHandler(ctrl.removeItemFromSection));

