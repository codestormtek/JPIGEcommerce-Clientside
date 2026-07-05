import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from '../../lib/prisma';
import { ApiError } from '../../utils/apiError';
import { logger } from '../../utils/logger';
import { config } from '../../config';
import { checkout } from '../orders/orders.service';
import { hashKioskToken } from './kiosk.middleware';
import { KioskOrderInput, CreateKioskDeviceInput, UpdateKioskDeviceInput } from './kiosk.schema';

// ─── Menu ─────────────────────────────────────────────────────────────────────

export async function getKioskMenu() {
  const products = await prisma.product.findMany({
    where: { isDeleted: false, items: { some: { qtyInStock: { gt: 0 } } } },
    include: {
      items: { where: { qtyInStock: { gt: 0 } }, orderBy: { price: 'asc' } },
      media: {
        include: { mediaAsset: true },
        orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
        take: 1,
      },
      categoryMaps: { include: { category: true }, orderBy: { displayOrder: 'asc' } },
    },
    orderBy: { name: 'asc' },
  });

  const categoriesMap = new Map<string, { id: string; name: string; imageUrl: string | null }>();

  const menuProducts = products.map((p) => {
    const primaryCategory = p.categoryMaps.find((m) => m.isPrimary) ?? p.categoryMaps[0];
    p.categoryMaps.forEach((m) => {
      if (!categoriesMap.has(m.category.id)) {
        categoriesMap.set(m.category.id, {
          id: m.category.id,
          name: m.category.name,
          imageUrl: m.category.imageUrl,
        });
      }
    });
    return {
      id: p.id,
      name: p.name,
      description: p.description,
      imageUrl: p.media[0]?.mediaAsset?.url ?? null,
      categoryIds: p.categoryMaps.map((m) => m.categoryId),
      primaryCategoryId: primaryCategory?.categoryId ?? null,
      items: p.items.map((i) => ({
        id: i.id,
        sku: i.sku,
        price: Number(i.price),
      })),
    };
  });

  return {
    categories: Array.from(categoriesMap.values()),
    products: menuProducts,
  };
}

// ─── Kiosk order ──────────────────────────────────────────────────────────────

const KIOSK_USER_EMAIL = 'kiosk-orders@jigglingpig.local';

/** Find-or-create the shared system user that owns all kiosk walk-up orders. */
async function getKioskSystemUser() {
  let user = await prisma.siteUser.findFirst({
    where: { emailAddress: { equals: KIOSK_USER_EMAIL, mode: 'insensitive' }, isDeleted: false },
  });
  if (!user) {
    const randomHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), config.bcrypt.saltRounds);
    user = await prisma.siteUser.create({
      data: {
        emailAddress: KIOSK_USER_EMAIL,
        firstName: 'Kiosk',
        lastName: 'Orders',
        passwordHash: randomHash,
        isActive: false,
        isGuest: true,
        role: 'user',
      },
    });
  }
  return user;
}

export async function createKioskOrder(deviceId: string, input: KioskOrderInput) {
  if (!input.squareNonce) {
    throw ApiError.badRequest('Payment is required to place a kiosk order.');
  }

  const user = await getKioskSystemUser();

  // Pickup orders have no shipping — the "billing" address slot carries the
  // customer's name/phone for the order ticket. Placeholder locality values
  // satisfy the shared order schema; they are never used for fulfillment.
  const order = await checkout(user.id, {
    lines: input.lines,
    addresses: [
      {
        addressType: 'billing',
        fullName: input.customerName,
        phone: input.customerPhone,
        addressLine1: 'In-Store Kiosk Order',
        city: process.env.STORE_SHIP_CITY ?? 'In-Store',
        postalCode: process.env.STORE_SHIP_ZIP ?? '00000',
        countryName: 'United States',
        countryIso2: 'US',
      },
    ],
    currency: 'USD',
    orderType: 'kiosk',
    specialInstructions: input.specialInstructions,
    squareNonce: input.squareNonce,
    kioskDeviceId: deviceId,
  });

  logger.info(`Kiosk order ${order.kioskOrderNumber} placed from device ${deviceId} (order ${order.id})`);

  return {
    orderId: order.id,
    kioskOrderNumber: order.kioskOrderNumber,
    grandTotal: Number(order.grandTotal),
  };
}

export async function getKioskOrderStatus(deviceId: string, orderId: string) {
  const order = await prisma.shopOrder.findFirst({
    where: { id: orderId, kioskDeviceId: deviceId },
    include: { orderStatus: true },
  });
  if (!order) throw ApiError.notFound('Order');
  return {
    orderId: order.id,
    kioskOrderNumber: order.kioskOrderNumber,
    status: order.orderStatus.status,
    grandTotal: Number(order.grandTotal),
  };
}

// ─── Admin: device management ─────────────────────────────────────────────────

export async function listKioskDevices() {
  const devices = await prisma.kioskDevice.findMany({ orderBy: { createdAt: 'asc' } });
  const now = Date.now();
  return devices.map((d) => ({
    id: d.id,
    name: d.name,
    isActive: d.isActive,
    lastSeenAt: d.lastSeenAt,
    online: d.lastSeenAt ? now - d.lastSeenAt.getTime() < 2 * 60 * 1000 : false,
    createdAt: d.createdAt,
  }));
}

export async function createKioskDevice(input: CreateKioskDeviceInput) {
  const token = `ksk_${randomBytes(24).toString('hex')}`;
  const device = await prisma.kioskDevice.create({
    data: { name: input.name, tokenHash: hashKioskToken(token) },
  });
  // The raw token is returned ONCE — only the hash is stored.
  return { id: device.id, name: device.name, token, createdAt: device.createdAt };
}

export async function updateKioskDevice(id: string, input: UpdateKioskDeviceInput) {
  const device = await prisma.kioskDevice.findUnique({ where: { id } });
  if (!device) throw ApiError.notFound('Kiosk device');
  const updated = await prisma.kioskDevice.update({ where: { id }, data: input });
  return { id: updated.id, name: updated.name, isActive: updated.isActive, lastSeenAt: updated.lastSeenAt };
}

/**
 * Deletes a device outright if it has no orders; otherwise revokes it
 * (isActive=false) so order history keeps its device reference.
 */
export async function deleteKioskDevice(id: string) {
  const device = await prisma.kioskDevice.findUnique({
    where: { id },
    include: { _count: { select: { orders: true } } },
  });
  if (!device) throw ApiError.notFound('Kiosk device');

  if (device._count.orders > 0) {
    await prisma.kioskDevice.update({ where: { id }, data: { isActive: false } });
    return { deleted: false, revoked: true, message: 'Device has order history — revoked instead of deleted.' };
  }

  await prisma.kioskDevice.delete({ where: { id } });
  return { deleted: true, revoked: false };
}
