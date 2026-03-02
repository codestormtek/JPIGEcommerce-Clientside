import prisma from '../../lib/prisma';
import { ListShipmentsInput, CreateShipmentInput, UpdateShipmentInput } from './shipments.schema';

// ─── Shared include ───────────────────────────────────────────────────────────

const shipmentInclude = {
  order: { select: { id: true, orderNumber: true } },
  items: {
    include: {
      orderLine: { select: { id: true, qty: true } },
    },
  },
} as const;

// ─── Shipments ────────────────────────────────────────────────────────────────

export async function findShipments(input: ListShipmentsInput) {
  const { page, limit, orderId, status, carrier, orderBy, order } = input;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (orderId) where['orderId'] = orderId;
  if (status) where['status'] = status;
  if (carrier) where['carrier'] = { contains: carrier, mode: 'insensitive' };

  const [data, total] = await Promise.all([
    prisma.shipment.findMany({
      where,
      include: shipmentInclude,
      orderBy: { [orderBy]: order },
      skip,
      take: limit,
    }),
    prisma.shipment.count({ where }),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function findShipmentById(id: string) {
  return prisma.shipment.findUnique({ where: { id }, include: shipmentInclude });
}

export async function findShipmentByOrderId(orderId: string) {
  return prisma.shipment.findUnique({ where: { orderId }, include: shipmentInclude });
}

export async function createShipment(input: CreateShipmentInput) {
  const { items, shippedAt, deliveredAt, ...rest } = input;
  return prisma.shipment.create({
    data: {
      ...rest,
      shippedAt: shippedAt ? new Date(shippedAt) : undefined,
      deliveredAt: deliveredAt ? new Date(deliveredAt) : undefined,
      items: {
        create: items.map((i) => ({
          orderLineId: i.orderLineId,
          qty: i.qty,
        })),
      },
    },
    include: shipmentInclude,
  });
}

export async function updateShipment(id: string, input: UpdateShipmentInput) {
  const { shippedAt, deliveredAt, ...rest } = input;
  return prisma.shipment.update({
    where: { id },
    data: {
      ...rest,
      shippedAt: shippedAt ? new Date(shippedAt) : undefined,
      deliveredAt: deliveredAt ? new Date(deliveredAt) : undefined,
    },
    include: shipmentInclude,
  });
}

export async function deleteShipment(id: string): Promise<void> {
  await prisma.shipmentItem.deleteMany({ where: { shipmentId: id } });
  await prisma.shipment.delete({ where: { id } });
}

