import { randomBytes, randomUUID } from 'crypto';
import { getSquareClient } from '../../lib/square';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from '../../lib/prisma';
import { ApiError } from '../../utils/apiError';
import { logger } from '../../utils/logger';
import { config } from '../../config';
import { checkout } from '../orders/orders.service';
import { hashKioskToken, invalidateKioskDeviceCache } from './kiosk.middleware';
import { KioskOrderInput, CreateKioskDeviceInput, UpdateKioskDeviceInput } from './kiosk.schema';

// ─── Menu ─────────────────────────────────────────────────────────────────────

export async function getKioskMenu() {
  const products = await prisma.product.findMany({
    where: {
      isDeleted: false,
      visibility: { in: ['kiosk', 'both'] },
      items: { some: { qtyInStock: { gt: 0 } } },
    },
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
  if (input.paymentMethod === 'card' && !input.squareNonce) {
    throw ApiError.badRequest('Payment is required to place a kiosk order.');
  }

  let terminalDeviceId: string | null = null;
  if (input.paymentMethod === 'terminal') {
    const device = await prisma.kioskDevice.findUnique({ where: { id: deviceId } });
    terminalDeviceId = device?.squareTerminalDeviceId ?? null;
    if (!terminalDeviceId) {
      throw ApiError.unprocessable('No card reader is linked to this kiosk. Pair a Square Terminal in the admin panel first.');
    }
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
    squareNonce: input.paymentMethod === 'card' ? input.squareNonce : undefined,
    kioskDeviceId: deviceId,
  });

  let terminalCheckoutId: string | null = null;

  if (input.paymentMethod === 'terminal') {
    try {
      const client = getSquareClient();
      const resp = await client.terminal.checkouts.create({
        idempotencyKey: randomUUID(),
        checkout: {
          amountMoney: {
            amount: BigInt(Math.round(Number(order.grandTotal) * 100)),
            currency: 'USD',
          },
          deviceOptions: { deviceId: terminalDeviceId! },
          referenceId: order.kioskOrderNumber ?? order.id.slice(0, 20),
          note: `Kiosk order ${order.kioskOrderNumber ?? order.id}`,
        },
      });
      terminalCheckoutId = resp.checkout?.id ?? null;
      if (!terminalCheckoutId) throw new Error('Square returned no Terminal checkout id');

      await prisma.payment.create({
        data: {
          orderId: order.id,
          provider: 'square_terminal',
          amount: Number(order.grandTotal),
          status: 'pending',
          providerTxnId: terminalCheckoutId,
        },
      });
    } catch (err) {
      // Payment never started — release the stock and void the order so the
      // customer can simply try again.
      logger.error(`Terminal checkout failed for kiosk order ${order.id}: ${err}`);
      await voidUnpaidKioskOrder(order.id).catch((e) =>
        logger.error(`Failed to void kiosk order ${order.id} after terminal error: ${e}`),
      );
      throw ApiError.unprocessable('Could not reach the card reader. Please try again or pay on screen.');
    }
  }

  logger.info(`Kiosk order ${order.kioskOrderNumber} placed from device ${deviceId} (order ${order.id})`);

  return {
    orderId: order.id,
    kioskOrderNumber: order.kioskOrderNumber,
    grandTotal: Number(order.grandTotal),
    paymentStatus: input.paymentMethod === 'terminal' ? 'pending' : 'paid',
    terminalCheckoutId,
  };
}

/**
 * Restores stock and marks an unpaid kiosk order cancelled (payment never completed).
 * Idempotent: uses an advisory lock + already-cancelled check so overlapping
 * poll/cancel/error paths can never restock the same order twice.
 */
async function voidUnpaidKioskOrder(orderId: string) {
  await prisma.$transaction(async (tx) => {
    // Serialize concurrent void attempts for this order within the transaction
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`kiosk_void:${orderId}`}))`;

    const order = await tx.shopOrder.findUnique({
      where: { id: orderId },
      include: { lines: true, orderStatus: true },
    });
    if (!order) return;

    const cancelled = await tx.orderStatus.findFirst({
      where: { status: { in: ['cancelled', 'canceled'], mode: 'insensitive' } },
    });

    // Already voided by another path — nothing to do (prevents double restock)
    if (cancelled && order.orderStatusId === cancelled.id) return;

    for (const line of order.lines) {
      if (line.productItemId) {
        await tx.productItem.update({
          where: { id: line.productItemId },
          data: { qtyInStock: { increment: line.qty } },
        });
      }
    }
    if (cancelled) {
      await tx.shopOrder.update({ where: { id: orderId }, data: { orderStatusId: cancelled.id } });
      await tx.orderStatusHistory.create({
        data: { orderId, newStatusId: cancelled.id, changedAt: new Date() },
      });
    }
  });
}

// ─── Terminal payment status / cancel ────────────────────────────────────────

export async function getKioskPaymentStatus(deviceId: string, orderId: string) {
  const order = await prisma.shopOrder.findFirst({
    where: { id: orderId, kioskDeviceId: deviceId },
    select: { id: true },
  });
  if (!order) throw ApiError.notFound('Order');

  const payment = await prisma.payment.findFirst({
    where: { orderId, provider: 'square_terminal' },
    orderBy: { createdAt: 'desc' },
  });
  if (!payment) throw ApiError.notFound('Terminal payment');

  if (payment.status === 'captured') return { status: 'paid' as const };
  if (payment.status === 'canceled' || payment.status === 'failed') {
    return { status: 'canceled' as const };
  }

  // Still pending — ask Square for the live Terminal checkout state
  const client = getSquareClient();
  const resp = await client.terminal.checkouts.get({ checkoutId: payment.providerTxnId! });
  const checkoutStatus = resp.checkout?.status;

  if (checkoutStatus === 'COMPLETED') {
    const squarePaymentId = resp.checkout?.paymentIds?.[0];
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'captured',
        capturedAt: new Date(),
        providerTxnId: squarePaymentId ?? payment.providerTxnId,
      },
    });
    logger.info(`Kiosk terminal payment captured for order ${orderId}`);
    return { status: 'paid' as const };
  }

  if (checkoutStatus === 'CANCELED') {
    // Conditional transition pending -> canceled; only the request that wins
    // the transition performs the void/restock.
    const transitioned = await prisma.payment.updateMany({
      where: { id: payment.id, status: 'pending' },
      data: { status: 'canceled' },
    });
    if (transitioned.count === 1) {
      await voidUnpaidKioskOrder(orderId).catch((e) =>
        logger.error(`Failed to void kiosk order ${orderId} after terminal cancel: ${e}`),
      );
    }
    return { status: 'canceled' as const };
  }

  return { status: 'pending' as const, terminalStatus: checkoutStatus ?? 'UNKNOWN' };
}

export async function cancelKioskPayment(deviceId: string, orderId: string) {
  const order = await prisma.shopOrder.findFirst({
    where: { id: orderId, kioskDeviceId: deviceId },
    select: { id: true },
  });
  if (!order) throw ApiError.notFound('Order');

  const payment = await prisma.payment.findFirst({
    where: { orderId, provider: 'square_terminal', status: 'pending' },
    orderBy: { createdAt: 'desc' },
  });
  if (!payment) return { canceled: false, message: 'No pending terminal payment to cancel' };

  try {
    await getSquareClient().terminal.checkouts.cancel({ checkoutId: payment.providerTxnId! });
  } catch (err) {
    // Checkout may have already completed or been canceled at Square —
    // re-check and let getKioskPaymentStatus own any resulting state change.
    logger.warn(`Terminal cancel for order ${orderId} failed: ${err}`);
    const status = await getKioskPaymentStatus(deviceId, orderId);
    if (status.status === 'paid') return { canceled: false, message: 'Payment already completed' };
    if (status.status === 'canceled') return { canceled: true };
    // Still pending at Square and cancel failed — surface the failure
    throw ApiError.unprocessable('Could not cancel the payment on the card reader. Please try again.');
  }

  // Conditional transition so only one caller performs the void/restock
  const transitioned = await prisma.payment.updateMany({
    where: { id: payment.id, status: 'pending' },
    data: { status: 'canceled' },
  });
  if (transitioned.count === 1) {
    await voidUnpaidKioskOrder(orderId).catch((e) =>
      logger.error(`Failed to void kiosk order ${orderId} after cancel: ${e}`),
    );
  }
  return { canceled: true };
}

// ─── Kiosk config (payment capabilities) ─────────────────────────────────────

export async function getKioskConfig(deviceId: string) {
  const device = await prisma.kioskDevice.findUnique({ where: { id: deviceId } });
  const sq = config.square;
  const hasSquare = Boolean(sq.accessToken);
  return {
    applicationId: sq.applicationId || null,
    locationId: sq.locationId || null,
    environment: sq.environment,
    terminalEnabled: hasSquare && Boolean(device?.squareTerminalDeviceId),
    cardEnabled: hasSquare && Boolean(sq.applicationId && sq.locationId),
  };
}

// ─── Admin: Square Terminal pairing ──────────────────────────────────────────

export async function startTerminalPairing(kioskDeviceId: string) {
  const device = await prisma.kioskDevice.findUnique({ where: { id: kioskDeviceId } });
  if (!device) throw ApiError.notFound('Kiosk device');

  const resp = await getSquareClient().devices.codes.create({
    idempotencyKey: randomUUID(),
    deviceCode: {
      productType: 'TERMINAL_API',
      name: device.name.slice(0, 128),
      locationId: config.square.locationId || undefined,
    },
  });
  const dc = resp.deviceCode;
  if (!dc?.id || !dc.code) throw ApiError.unprocessable('Square did not return a device code');

  return {
    deviceCodeId: dc.id,
    code: dc.code,
    status: dc.status ?? 'UNPAIRED',
    instructions: 'On the Square Terminal: Settings → Sign out (if needed) → enter this device code.',
  };
}

export async function checkTerminalPairing(kioskDeviceId: string, deviceCodeId: string) {
  const device = await prisma.kioskDevice.findUnique({ where: { id: kioskDeviceId } });
  if (!device) throw ApiError.notFound('Kiosk device');

  const resp = await getSquareClient().devices.codes.get({ id: deviceCodeId });
  const dc = resp.deviceCode;

  if (dc?.status === 'PAIRED' && dc.deviceId) {
    await prisma.kioskDevice.update({
      where: { id: kioskDeviceId },
      data: { squareTerminalDeviceId: dc.deviceId },
    });
    logger.info(`Square Terminal ${dc.deviceId} paired to kiosk device ${kioskDeviceId}`);
    return { paired: true, terminalDeviceId: dc.deviceId };
  }

  return { paired: false, status: dc?.status ?? 'UNKNOWN', code: dc?.code ?? null };
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
    squareTerminalDeviceId: d.squareTerminalDeviceId,
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
  // Revocations/re-activations must take effect immediately, not after cache TTL.
  if (input.isActive !== undefined) invalidateKioskDeviceCache();
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
    invalidateKioskDeviceCache();
    return { deleted: false, revoked: true, message: 'Device has order history — revoked instead of deleted.' };
  }

  await prisma.kioskDevice.delete({ where: { id } });
  invalidateKioskDeviceCache();
  return { deleted: true, revoked: false };
}
