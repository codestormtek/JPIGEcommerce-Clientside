import { ApiError } from '../../utils/apiError';
import { AddCartItemInput, UpdateCartItemInput } from './cart.schema';
import * as repo from './cart.repository';
import prisma from '../../lib/prisma';

// ─── Get (or create) the user's active cart ───────────────────────────────────

export async function getMyCart(userId: string) {
  return repo.findOrCreateCart(userId);
}

// ─── Add item ─────────────────────────────────────────────────────────────────

export async function addItem(userId: string, input: AddCartItemInput) {
  // Validate product item exists and is published
  const productItem = await prisma.productItem.findUnique({
    where: { id: input.productItemId },
  });
  if (!productItem || !productItem.isPublished) {
    throw ApiError.notFound('Product item');
  }
  if (productItem.qtyInStock < input.qty) {
    throw ApiError.unprocessable(`Insufficient stock for SKU ${productItem.sku}`);
  }

  // Validate variation option IDs if provided
  if (input.variationOptionIds?.length) {
    const options = await prisma.variationOption.findMany({
      where: { id: { in: input.variationOptionIds } },
    });
    if (options.length !== input.variationOptionIds.length) {
      throw ApiError.badRequest('One or more variation option IDs are invalid');
    }
  }

  const cart = await repo.findOrCreateCart(userId);
  return repo.addOrIncrementItem(cart.id, input, Number(productItem.price));
}

// ─── Update item qty ──────────────────────────────────────────────────────────

export async function updateItem(userId: string, itemId: string, input: UpdateCartItemInput) {
  const item = await repo.findCartItemById(itemId);
  if (!item) throw ApiError.notFound('Cart item');

  // Verify ownership — item must belong to this user's active cart
  const cart = await repo.findCartByUser(userId);
  if (!cart || item.cartId !== cart.id) throw ApiError.forbidden('Not your cart item');

  return repo.updateCartItemQty(itemId, input);
}

// ─── Remove item ──────────────────────────────────────────────────────────────

export async function removeItem(userId: string, itemId: string) {
  const item = await repo.findCartItemById(itemId);
  if (!item) throw ApiError.notFound('Cart item');

  const cart = await repo.findCartByUser(userId);
  if (!cart || item.cartId !== cart.id) throw ApiError.forbidden('Not your cart item');

  return repo.removeCartItem(itemId);
}

// ─── Clear cart ───────────────────────────────────────────────────────────────

export async function clearCart(userId: string) {
  const cart = await repo.findOrCreateCart(userId);
  return repo.clearCartItems(cart.id);
}

