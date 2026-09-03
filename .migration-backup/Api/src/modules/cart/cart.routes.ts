import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import { addCartItemSchema, updateCartItemSchema } from './cart.schema';
import * as ctrl from './cart.controller';

export const cartRouter = Router();

// All cart routes require authentication
cartRouter.use(authenticate);

// GET    /api/v1/cart            — get (or create) my cart
cartRouter.get('/', asyncHandler(ctrl.getCart));

// POST   /api/v1/cart/items      — add an item
cartRouter.post('/items', validate(addCartItemSchema), asyncHandler(ctrl.addItem));

// PATCH  /api/v1/cart/items/:itemId  — update qty
cartRouter.patch('/items/:itemId', validate(updateCartItemSchema), asyncHandler(ctrl.updateItem));

// DELETE /api/v1/cart/items/:itemId  — remove an item
cartRouter.delete('/items/:itemId', asyncHandler(ctrl.removeItem));

// DELETE /api/v1/cart            — clear all items
cartRouter.delete('/', asyncHandler(ctrl.clearCart));

