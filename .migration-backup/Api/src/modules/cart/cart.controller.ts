import { Response } from 'express';
import { AuthRequest } from '../../types';
import { sendSuccess, sendNoContent } from '../../utils/apiResponse';
import { AddCartItemInput, UpdateCartItemInput } from './cart.schema';
import * as service from './cart.service';

// GET /api/v1/cart
export async function getCart(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const cart = await service.getMyCart(userId);
  sendSuccess(res, cart);
}

// POST /api/v1/cart/items
export async function addItem(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const item = await service.addItem(userId, req.body as AddCartItemInput);
  sendSuccess(res, item, 'Item added to cart');
}

// PATCH /api/v1/cart/items/:itemId
export async function updateItem(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const itemId = req.params['itemId'] as string;
  const item = await service.updateItem(userId, itemId, req.body as UpdateCartItemInput);
  sendSuccess(res, item, 'Cart item updated');
}

// DELETE /api/v1/cart/items/:itemId
export async function removeItem(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const itemId = req.params['itemId'] as string;
  await service.removeItem(userId, itemId);
  sendNoContent(res);
}

// DELETE /api/v1/cart
export async function clearCart(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const cart = await service.clearCart(userId);
  sendSuccess(res, cart, 'Cart cleared');
}

