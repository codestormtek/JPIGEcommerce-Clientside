import prisma from '../../lib/prisma';
import { ListInventoryInput, CreateInventoryItemInput, UpdateInventoryItemInput } from './inventory.schema';

const itemInclude = {
  product: { select: { id: true, name: true } },
  options: {
    include: {
      variationOption: {
        include: { variation: { select: { id: true, name: true } } },
      },
    },
  },
} as const;

export async function findInventoryItems(input: ListInventoryInput) {
  const { page, limit, search, productId, lowStock, threshold, orderBy, order } = input;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (productId) where['productId'] = productId;

  if (search) {
    where['OR'] = [
      { sku: { contains: search, mode: 'insensitive' } },
      { product: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }

  if (lowStock) {
    where['qtyInStock'] = { lte: threshold };
  }

  const [data, total] = await Promise.all([
    prisma.productItem.findMany({
      where,
      include: itemInclude,
      orderBy: { [orderBy]: order },
      skip,
      take: limit,
    }),
    prisma.productItem.count({ where }),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function findInventoryItemById(id: string) {
  return prisma.productItem.findUnique({ where: { id }, include: itemInclude });
}

export async function createInventoryItem(input: CreateInventoryItemInput) {
  const { productId, ...rest } = input;
  return prisma.productItem.create({
    data: { ...rest, productId },
    include: itemInclude,
  });
}

export async function updateInventoryItem(id: string, input: UpdateInventoryItemInput) {
  return prisma.productItem.update({
    where: { id },
    data: input,
    include: itemInclude,
  });
}

export async function deleteInventoryItem(id: string): Promise<void> {
  await prisma.productItem.delete({ where: { id } });
}

