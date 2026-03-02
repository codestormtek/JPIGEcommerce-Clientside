import prisma from '../../lib/prisma';
import { ListOrdersInput, PlaceOrderInput } from './orders.schema';

type TxClient = Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

// ─── Shared include ───────────────────────────────────────────────────────────

const orderInclude = {
  orderStatus: true,
  shippingMethod: true,
  addresses: true,
  lines: {
    include: {
      productItem: { include: { product: true } },
      options: { include: { variationOption: true } },
    },
  },
  payments: true,
  statusHistory: { include: { newStatus: true, oldStatus: true }, orderBy: { changedAt: 'desc' as const } },
} as const;

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function findOrders(input: ListOrdersInput, callerUserId?: string) {
  const { page, limit, userId, statusId, orderType, orderBy, order } = input;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  // Non-admins can only see their own orders
  if (callerUserId) where['userId'] = callerUserId;
  else if (userId) where['userId'] = userId;
  if (statusId) where['orderStatusId'] = statusId;
  if (orderType) where['orderType'] = orderType;

  const [data, total] = await Promise.all([
    prisma.shopOrder.findMany({
      where,
      include: orderInclude,
      orderBy: { [orderBy]: order },
      skip,
      take: limit,
    }),
    prisma.shopOrder.count({ where }),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function findOrderById(id: string) {
  return prisma.shopOrder.findUnique({ where: { id }, include: orderInclude });
}

export async function findOrderByIdAndUser(id: string, userId: string) {
  return prisma.shopOrder.findFirst({ where: { id, userId }, include: orderInclude });
}

// ─── Checkout (place order) ───────────────────────────────────────────────────

export async function findProductItemPrices(ids: string[]) {
  return prisma.productItem.findMany({
    where: { id: { in: ids } },
    select: { id: true, price: true },
  });
}

export async function placeOrder(userId: string, input: PlaceOrderInput, taxTotal = 0, discountTotal = 0) {
  return prisma.$transaction(async (tx: TxClient) => {
    // Resolve "pending" status
    const pendingStatus = await tx.orderStatus.findFirst({ where: { status: 'pending' } });
    if (!pendingStatus) throw new Error('Order status "pending" not seeded in database');

    // Fetch product items and validate stock
    const itemIds = input.lines.map((l) => l.productItemId);
    const productItems = await tx.productItem.findMany({ where: { id: { in: itemIds } } });

    let subtotal = 0;
    const lineData = input.lines.map((l) => {
      const item = productItems.find((p) => p.id === l.productItemId);
      if (!item) throw new Error(`Product item ${l.productItemId} not found`);
      if (item.qtyInStock < l.qty) throw new Error(`Insufficient stock for SKU ${item.sku}`);
      const lineTotal = Number(item.price) * l.qty;
      subtotal += lineTotal;
      return { item, l, lineTotal };
    });

    // Fetch shipping cost
    let shippingTotal = 0;
    if (input.shippingMethodId) {
      const sm = await tx.shippingMethod.findUnique({ where: { id: input.shippingMethodId } });
      if (sm) shippingTotal = Number(sm.price);
    }

    const grandTotal = subtotal + shippingTotal + taxTotal - discountTotal;

    // Create order
    const order = await tx.shopOrder.create({
      data: {
        userId,
        orderDate: new Date(),
        orderStatusId: pendingStatus.id,
        shippingMethodId: input.shippingMethodId,
        currency: input.currency,
        orderType: input.orderType,
        specialInstructions: input.specialInstructions,
        subtotal,
        discountTotal,
        taxTotal,
        shippingTotal,
        grandTotal,
        addresses: { create: input.addresses },
        lines: {
          create: lineData.map(({ item, l, lineTotal }) => ({
            productItemId: item.id,
            qty: l.qty,
            unitPriceSnapshot: item.price,
            lineTotal,
            skuSnapshot: item.sku,
            productNameSnapshot: item.sku, // will be enriched by service
          })),
        },
        statusHistory: {
          create: { newStatusId: pendingStatus.id, changedAt: new Date() },
        },
      },
      include: orderInclude,
    });

    // Decrement stock
    for (const { item, l } of lineData) {
      await tx.productItem.update({
        where: { id: item.id },
        data: { qtyInStock: { decrement: l.qty } },
      });
    }

    return order;
  });
}

// ─── Status update ────────────────────────────────────────────────────────────

export async function updateOrderStatus(orderId: string, newStatusId: string, changedByUserId: string | null) {
  return prisma.$transaction(async (tx: TxClient) => {
    const order = await tx.shopOrder.findUnique({ where: { id: orderId }, select: { orderStatusId: true } });
    if (!order) throw new Error('Order not found');

    await tx.orderStatusHistory.create({
      data: {
        orderId,
        oldStatusId: order.orderStatusId,
        newStatusId,
        changedAt: new Date(),
        changedByUserId,
      },
    });

    return tx.shopOrder.update({
      where: { id: orderId },
      data: { orderStatusId: newStatusId },
      include: orderInclude,
    });
  });
}

// ─── Lookups ──────────────────────────────────────────────────────────────────

export async function findAllStatuses() {
  return prisma.orderStatus.findMany({ orderBy: { status: 'asc' } });
}

export async function findAllShippingMethods() {
  return prisma.shippingMethod.findMany({ orderBy: { name: 'asc' } });
}

