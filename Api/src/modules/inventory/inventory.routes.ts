import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import { listInventorySchema, createInventoryItemSchema, updateInventoryItemSchema } from './inventory.schema';
import * as ctrl from './inventory.controller';

export const inventoryRouter = Router();

// All inventory routes are admin-only
inventoryRouter.use(authenticate, authorize('admin'));

// GET    /api/v1/inventory          — list all product items (paginated + filterable)
inventoryRouter.get('/', validate(listInventorySchema, 'query'), asyncHandler(ctrl.listInventory));

// GET    /api/v1/inventory/:id      — single item
inventoryRouter.get('/:id', asyncHandler(ctrl.getInventoryItem));

// POST   /api/v1/inventory          — create a new product item (SKU)
inventoryRouter.post('/', validate(createInventoryItemSchema), asyncHandler(ctrl.createItem));

// PATCH  /api/v1/inventory/:id      — update an existing product item
inventoryRouter.patch('/:id', validate(updateInventoryItemSchema), asyncHandler(ctrl.updateItem));

// DELETE /api/v1/inventory/:id      — delete a product item
inventoryRouter.delete('/:id', asyncHandler(ctrl.deleteItem));

