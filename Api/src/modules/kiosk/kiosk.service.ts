import { randomBytes, randomUUID } from 'crypto';
import { getSquareClient } from '../../lib/square';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from '../../lib/prisma';
import { ApiError } from '../../utils/apiError';
import { logger } from '../../utils/logger';
import { config } from '../../config';
import { normalizePhone } from '../../lib/phone';
import { checkout } from '../orders/orders.service';
import { sendNewOrderStoreAlerts } from '../order-notifications/order-notifications.service';
import { hashKioskToken, invalidateKioskDeviceCache } from './kiosk.middleware';
import { KioskOrderInput, CreateKioskDeviceInput, UpdateKioskDeviceInput } from './kiosk.schema';

// ─── Menu ─────────────────────────────────────────────────────────────────────

// ─── Combo defaults by category ───────────────────────────────────────────────
// Any product in the "Combo Dinners" category is automatically a combo meal:
// it includes DEFAULT_COMBO_SIDE_COUNT free sides from the "Sides" category,
// unless the product has its own explicit combo settings (comboSideCount > 0),
// which always take priority.

const COMBO_CATEGORY_NAME = 'combo dinners';
const SIDES_CATEGORY_NAME = 'sides';
const DEFAULT_COMBO_SIDE_COUNT = 2;

async function getSidesCategoryId(): Promise<string | null> {
  const cat = await prisma.productCategory.findFirst({
    where: { name: { equals: SIDES_CATEGORY_NAME, mode: 'insensitive' } },
  });
  return cat?.id ?? null;
}

function effectiveComboConfig(
  product: { comboSideCount: number; comboSideCategoryId: string | null },
  categoryNames: string[],
  sidesCategoryId: string | null,
): { sideCount: number; sideCategoryId: string | null } {
  if (product.comboSideCount > 0) {
    return { sideCount: product.comboSideCount, sideCategoryId: product.comboSideCategoryId };
  }
  const isComboByCategory = categoryNames.some(
    (n) => n.trim().toLowerCase() === COMBO_CATEGORY_NAME,
  );
  if (isComboByCategory && sidesCategoryId) {
    return { sideCount: DEFAULT_COMBO_SIDE_COUNT, sideCategoryId: sidesCategoryId };
  }
  return { sideCount: 0, sideCategoryId: null };
}

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

  const sidesCategoryId = await getSidesCategoryId();
  const categoriesMap = new Map<string, { id: string; name: string; imageUrl: string | null }>();

  const menuProducts = products.map((p) => {
    const primaryCategory = p.categoryMaps.find((m) => m.isPrimary) ?? p.categoryMaps[0];
    const comboConfig = effectiveComboConfig(
      p,
      p.categoryMaps.map((m) => m.category.name),
      sidesCategoryId,
    );
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
      comboSideCount: comboConfig.sideCount,
      comboSideCategoryId: comboConfig.sideCategoryId,
      duplicateSideUpcharge: Number(p.duplicateSideUpcharge),
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

/**
 * Validates combo side selections for each order line and returns the lines
 * enriched with a display snapshot of the chosen sides. Sides are included
 * free with combo meals, except when the same premium side is picked more than
 * once: each extra pick beyond the first adds that side's
 * `duplicateSideUpcharge` to the combo's per-unit price (computed server-side —
 * the client can never set the amount).
 */
export async function resolveComboSides(lines: KioskOrderInput['lines']) {
  const itemIds = lines.map((l) => l.productItemId);
  const items = await prisma.productItem.findMany({
    where: { id: { in: itemIds } },
    include: {
      product: { include: { categoryMaps: { include: { category: true } } } },
    },
  });
  const itemMap = new Map(items.map((i) => [i.id, i]));
  const sidesCategoryId = await getSidesCategoryId();

  const allSideIds = [...new Set(lines.flatMap((l) => l.sideProductIds ?? []))];
  const sideProducts = allSideIds.length
    ? await prisma.product.findMany({
        where: {
          id: { in: allSideIds },
          isDeleted: false,
          visibility: { in: ['kiosk', 'both'] },
        },
        include: { categoryMaps: true },
      })
    : [];
  const sideMap = new Map(sideProducts.map((p) => [p.id, p]));

  return lines.map((l) => {
    const item = itemMap.get(l.productItemId);
    if (!item) throw ApiError.badRequest('One of the items in your order is no longer available.');
    const combo = item.product;
    const wanted = l.sideProductIds ?? [];
    const { sideCount, sideCategoryId } = effectiveComboConfig(
      combo,
      combo.categoryMaps.map((m) => m.category.name),
      sidesCategoryId,
    );

    if (sideCount > 0) {
      if (wanted.length !== sideCount) {
        throw ApiError.badRequest(
          `"${combo.name}" comes with ${sideCount} side${sideCount > 1 ? 's' : ''} — please choose ${sideCount}.`,
        );
      }
      const names = wanted.map((sid) => {
        const side = sideMap.get(sid);
        if (!side) throw ApiError.badRequest('One of the chosen sides is no longer available.');
        if (
          sideCategoryId &&
          !side.categoryMaps.some((m) => m.categoryId === sideCategoryId)
        ) {
          throw ApiError.badRequest(`"${side.name}" is not an available side for "${combo.name}".`);
        }
        return side.name;
      });

      // Duplicate premium sides: each pick of the same side beyond the first
      // adds that side's upcharge to the combo's per-unit price.
      const countsById = new Map<string, number>();
      wanted.forEach((sid) => countsById.set(sid, (countsById.get(sid) ?? 0) + 1));
      let sideUpcharge = 0;
      for (const [sid, count] of countsById) {
        if (count > 1) {
          const amount = Number(sideMap.get(sid)!.duplicateSideUpcharge);
          if (amount > 0) sideUpcharge += (count - 1) * amount;
        }
      }
      sideUpcharge = Math.round(sideUpcharge * 100) / 100;

      const sidesText =
        sideUpcharge > 0
          ? `${names.join(', ')} (+$${sideUpcharge.toFixed(2)} upcharge)`
          : names.join(', ');

      return {
        productItemId: l.productItemId,
        qty: l.qty,
        sidesText,
        ...(sideUpcharge > 0 ? { sideUpcharge } : {}),
      };
    }

    if (wanted.length > 0) {
      throw ApiError.badRequest(`"${combo.name}" does not include side selections.`);
    }
    return { productItemId: l.productItemId, qty: l.qty };
  });
}

export async function createKioskOrder(deviceId: string, input: KioskOrderInput) {
  if (input.paymentMethod === 'card' && !input.squareNonce) {
    throw ApiError.badRequest('Payment is required to place a kiosk order.');
  }

  const existingOrder = await prisma.shopOrder.findFirst({
    where: { kioskDeviceId: deviceId, kioskRequestId: input.clientRequestId },
    include: { payments: { orderBy: { createdAt: 'desc' }, take: 1 } },
  });
  if (existingOrder) {
    const existingPayment = existingOrder.payments[0];
    return {
      orderId: existingOrder.id,
      kioskOrderNumber: existingOrder.kioskOrderNumber,
      grandTotal: Number(existingOrder.grandTotal),
      paymentStatus: existingPayment?.status === 'captured' ? 'paid' : 'pending',
      terminalCheckoutId: parseTerminalCheckoutId(existingPayment?.providerTxnId ?? null),
    };
  }

  const linesWithSides = await resolveComboSides(input.lines);

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
    lines: linesWithSides,
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
    kioskRequestId: input.clientRequestId,
  });

  let terminalCheckoutId: string | null = null;

  if (input.paymentMethod === 'terminal') {
    let squareOrderId: string | null = null;
    let terminalMayHaveStarted = false;
    try {
      const client = getSquareClient();
      const locationId = config.square.locationId;
      if (!locationId) throw new Error('Square location ID is not configured');

      const grandTotalCents = Math.round(Number(order.grandTotal) * 100);
      const orderLineTotalCents = order.lines.reduce(
        (total, line) => total + Math.round(Number(line.lineTotal) * 100),
        0,
      );
      const positiveAdjustmentCents = Math.max(0, grandTotalCents - orderLineTotalCents);
      const discountCents = Math.max(0, orderLineTotalCents - grandTotalCents);
      const squareLineItems = order.lines.map((line) => ({
        name: line.productNameSnapshot,
        quantity: String(line.qty),
        note: line.sideSelectionsText?.slice(0, 500) || undefined,
        basePriceMoney: {
          amount: BigInt(Math.round(Number(line.unitPriceSnapshot) * 100)),
          currency: 'USD' as const,
        },
      }));
      if (positiveAdjustmentCents > 0) {
        squareLineItems.push({
          name: 'Tax and adjustments',
          quantity: '1',
          note: undefined,
          basePriceMoney: {
            amount: BigInt(positiveAdjustmentCents),
            currency: 'USD' as const,
          },
        });
      }

      const customerPhone = normalizePhone(input.customerPhone);
      const squareOrderResp = await client.orders.create({
        idempotencyKey: `sqo-${order.id}`,
        order: {
          locationId,
          referenceId: order.kioskOrderNumber ?? order.id.slice(0, 20),
          ticketName: input.customerName.slice(0, 30),
          lineItems: squareLineItems,
          ...(discountCents > 0
            ? {
                discounts: [{
                  name: 'Order discount',
                  scope: 'ORDER' as const,
                  amountMoney: { amount: BigInt(discountCents), currency: 'USD' as const },
                }],
              }
            : {}),
          ...(customerPhone
            ? {
                fulfillments: [{
                  type: 'PICKUP' as const,
                  state: 'PROPOSED' as const,
                  pickupDetails: {
                    scheduleType: 'ASAP' as const,
                    recipient: {
                      displayName: input.customerName,
                      phoneNumber: customerPhone,
                    },
                  },
                }],
              }
            : {}),
        },
      });
      squareOrderId = squareOrderResp.order?.id ?? null;
      if (!squareOrderId) throw new Error('Square returned no order id');
      const squareTotalCents = squareOrderResp.order?.totalMoney?.amount;
      if (squareTotalCents == null || squareTotalCents !== BigInt(grandTotalCents)) {
        throw new Error(
          `Square order total ${squareTotalCents?.toString() ?? 'missing'} did not match local total ${grandTotalCents}`,
        );
      }

      const payment = await prisma.payment.create({
        data: {
          orderId: order.id,
          provider: 'square_terminal',
          amount: Number(order.grandTotal),
          status: 'pending',
          providerTxnId: `order:${squareOrderId}`,
        },
      });

      const createTerminalCheckout = () =>
        client.terminal.checkouts.create({
          idempotencyKey: `sqc-${order.id}`,
          checkout: {
            amountMoney: {
              amount: BigInt(grandTotalCents),
              currency: 'USD',
            },
            deviceOptions: { deviceId: terminalDeviceId! },
            referenceId: order.kioskOrderNumber ?? order.id.slice(0, 20),
            note: `Kiosk order ${order.kioskOrderNumber ?? order.id}`.slice(0, 500),
            orderId: squareOrderId!,
          },
        });

      terminalMayHaveStarted = true;
      let resp;
      try {
        resp = await createTerminalCheckout();
      } catch (firstError) {
        logger.warn(`Retrying idempotent Terminal checkout for kiosk order ${order.id}: ${firstError}`);
        resp = await createTerminalCheckout();
      }
      terminalCheckoutId = resp.checkout?.id ?? null;
      if (!terminalCheckoutId) throw new Error('Square returned no Terminal checkout id');

      await prisma.payment.update({
        where: { id: payment.id },
        data: { providerTxnId: `checkout:${terminalCheckoutId}` },
      });
    } catch (err) {
      logger.error(`Terminal checkout failed for kiosk order ${order.id}: ${err}`);
      if (terminalMayHaveStarted) {
        throw ApiError.unprocessable(
          'The card reader result could not be confirmed. Please ask staff to check the payment before trying again.',
        );
      }
      // No Terminal checkout was attempted, so no customer charge is possible.
      // Release stock and void the local order; any Square Order is uncharged.
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

function parseTerminalCheckoutId(providerTxnId: string | null): string | null {
  if (!providerTxnId || providerTxnId.startsWith('order:')) return null;
  return providerTxnId.startsWith('checkout:')
    ? providerTxnId.slice('checkout:'.length)
    : providerTxnId; // Backward compatibility for existing checkout IDs.
}

async function recoverTerminalCheckoutId(
  squareOrderId: string,
  squareTerminalDeviceId: string,
  createdAt: Date,
): Promise<string | null> {
  const response = await getSquareClient().terminal.checkouts.search({
    query: {
      filter: {
        deviceId: squareTerminalDeviceId,
        createdAt: {
          startAt: new Date(createdAt.getTime() - 5 * 60 * 1000).toISOString(),
        },
      },
    },
    limit: 100,
  });
  return response.checkouts?.find((checkout) => checkout.orderId === squareOrderId)?.id ?? null;
}

async function sendPaidKioskStoreAlert(orderId: string): Promise<void> {
  const order = await prisma.shopOrder.findUnique({
    where: { id: orderId },
    include: {
      addresses: true,
      lines: true,
    },
  });
  if (!order) return;
  const billingAddress = order.addresses.find((address) => address.addressType === 'billing');
  await sendNewOrderStoreAlerts({
    orderNumber: `ORD-${order.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`,
    customerName: billingAddress?.fullName || 'Kiosk Customer',
    customerPhone: normalizePhone(billingAddress?.phone),
    itemCount: order.lines.reduce((total, line) => total + line.qty, 0),
    items: order.lines.map((line) => ({
      name: line.productNameSnapshot || 'Item',
      qty: line.qty,
      sides: line.sideSelectionsText,
    })),
    grandTotal: Number(order.grandTotal),
    currency: order.currency,
  });
}

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
  let checkoutId = parseTerminalCheckoutId(payment.providerTxnId);
  if (!checkoutId && payment.providerTxnId?.startsWith('order:')) {
    const device = await prisma.kioskDevice.findUnique({
      where: { id: deviceId },
      select: { squareTerminalDeviceId: true },
    });
    if (!device?.squareTerminalDeviceId) {
      return { status: 'pending' as const, terminalStatus: 'INITIALIZING' };
    }
    checkoutId = await recoverTerminalCheckoutId(
      payment.providerTxnId.slice('order:'.length),
      device.squareTerminalDeviceId,
      payment.createdAt,
    );
    if (checkoutId) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { providerTxnId: `checkout:${checkoutId}` },
      });
    }
  }
  if (!checkoutId) {
    return { status: 'pending' as const, terminalStatus: 'INITIALIZING' };
  }
  const client = getSquareClient();
  const resp = await client.terminal.checkouts.get({ checkoutId });
  const checkoutStatus = resp.checkout?.status;

  if (checkoutStatus === 'COMPLETED') {
    const squarePaymentId = resp.checkout?.paymentIds?.[0];
    const transitioned = await prisma.payment.updateMany({
      where: { id: payment.id, status: 'pending' },
      data: {
        status: 'captured',
        capturedAt: new Date(),
        providerTxnId: squarePaymentId ?? payment.providerTxnId,
      },
    });
    if (transitioned.count === 1) {
      void sendPaidKioskStoreAlert(orderId).catch((error) =>
        logger.warn(`Paid kiosk store alert failed for order ${orderId}: ${error}`),
      );
    }
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

  let checkoutId = parseTerminalCheckoutId(payment.providerTxnId);
  if (!checkoutId && payment.providerTxnId?.startsWith('order:')) {
    const device = await prisma.kioskDevice.findUnique({
      where: { id: deviceId },
      select: { squareTerminalDeviceId: true },
    });
    if (!device?.squareTerminalDeviceId) {
      throw ApiError.unprocessable(
        'The card reader status is still being confirmed. Please check the payment before trying again.',
      );
    }
    checkoutId = await recoverTerminalCheckoutId(
      payment.providerTxnId.slice('order:'.length),
      device.squareTerminalDeviceId,
      payment.createdAt,
    );
    if (checkoutId) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { providerTxnId: `checkout:${checkoutId}` },
      });
    }
  }
  if (!checkoutId) {
    throw ApiError.unprocessable(
      'The card reader status is still being confirmed. Please check the payment before trying again.',
    );
  }

  try {
    await getSquareClient().terminal.checkouts.cancel({ checkoutId });
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
