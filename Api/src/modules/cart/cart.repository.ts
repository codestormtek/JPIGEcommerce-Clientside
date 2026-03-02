import prisma from '../../lib/prisma';
import { AddCartItemInput, UpdateCartItemInput } from './cart.schema';

// ─── Shared include ───────────────────────────────────────────────────────────

const cartInclude = {
  items: {
    include: {
      productItem: { include: { product: true } },
      options: { include: { variationOption: true } },
    },
  },
} as const;

// ─── Cart retrieval / creation ────────────────────────────────────────────────

export async function findOrCreateCart(userId: string) {
  const existing = await prisma.shoppingCart.findFirst({
    where: { userId, status: 'active', isDeleted: false },
    include: cartInclude,
  });
  if (existing) return existing;

  return prisma.shoppingCart.create({
    data: { userId, status: 'active' },
    include: cartInclude,
  });
}

export async function findCartByUser(userId: string) {
  return prisma.shoppingCart.findFirst({
    where: { userId, status: 'active', isDeleted: false },
    include: cartInclude,
  });
}

// ─── Items ────────────────────────────────────────────────────────────────────

export async function findCartItemById(itemId: string) {
  return prisma.shoppingCartItem.findUnique({
    where: { id: itemId },
    include: { options: true },
  });
}

export async function addOrIncrementItem(
  cartId: string,
  input: AddCartItemInput,
  unitPrice: number,
) {
  // If the same productItemId already exists in the cart, increment qty
  const existing = await prisma.shoppingCartItem.findFirst({
    where: { cartId, productItemId: input.productItemId },
  });

  if (existing) {
    return prisma.shoppingCartItem.update({
      where: { id: existing.id },
      data: { qty: { increment: input.qty } },
      include: { productItem: { include: { product: true } }, options: { include: { variationOption: true } } },
    });
  }

  return prisma.shoppingCartItem.create({
    data: {
      cartId,
      productItemId: input.productItemId,
      qty: input.qty,
      unitPriceSnapshot: unitPrice,
      options: input.variationOptionIds?.length
        ? {
            create: input.variationOptionIds.map((id) => ({ variationOptionId: id })),
          }
        : undefined,
    },
    include: { productItem: { include: { product: true } }, options: { include: { variationOption: true } } },
  });
}

export async function updateCartItemQty(itemId: string, input: UpdateCartItemInput) {
  return prisma.shoppingCartItem.update({
    where: { id: itemId },
    data: { qty: input.qty },
    include: { productItem: { include: { product: true } }, options: { include: { variationOption: true } } },
  });
}

export async function removeCartItem(itemId: string) {
  // Delete child options first (cascade not guaranteed for composite PKs)
  await prisma.cartItemOption.deleteMany({ where: { cartItemId: itemId } });
  return prisma.shoppingCartItem.delete({ where: { id: itemId } });
}

export async function clearCartItems(cartId: string) {
  // Remove all options for items in this cart, then the items themselves
  const items = await prisma.shoppingCartItem.findMany({
    where: { cartId },
    select: { id: true },
  });
  const itemIds = items.map((i) => i.id);
  if (itemIds.length) {
    await prisma.cartItemOption.deleteMany({ where: { cartItemId: { in: itemIds } } });
    await prisma.shoppingCartItem.deleteMany({ where: { cartId } });
  }

  return prisma.shoppingCart.findUnique({
    where: { id: cartId },
    include: cartInclude,
  });
}

