import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from '../../lib/prisma';
import { config } from '../../config';
import { ApiError } from '../../utils/apiError';
import { logger } from '../../utils/logger';
import { normalizePhone } from '../../lib/phone';
import { getSquareClient } from '../../lib/square';
import * as squareService from '../../services/squareService';
import { restoreOrderInventoryOnceTx } from '../../services/orderInventoryRestoration';
import { enqueueStaffOrderPush } from '../../services/expoPushNotifications';
import { enqueueCapturedOrderKitchenTickets } from '../cloudprnt/cloudprnt.service';
import { getKioskMenu, resolveComboSides } from '../kiosk/kiosk.service';
import * as orderRepo from '../orders/orders.repository';
import type { CheckoutInput } from '../orders/orders.schema';
import * as settingsRepo from '../site-settings/site-settings.repository';
import type { PickupCheckoutInput, PickupConfigInput } from './pickup.schema';

const PICKUP_SETTING_KEY = 'pickup_event_config';
const PICKUP_SYSTEM_EMAIL = 'pickup-orders@jigglingpig.local';
const DEFINITIVE_SQUARE_DECLINE_CODES = new Set([
  'CARD_DECLINED',
  'CARD_EXPIRED',
  'CVV_FAILURE',
  'VERIFY_CVV_FAILURE',
  'ADDRESS_VERIFICATION_FAILURE',
  'INSUFFICIENT_FUNDS',
  'PAYMENT_LIMIT_EXCEEDED',
  'CARD_NOT_SUPPORTED',
  'SOURCE_USED',
  'SOURCE_EXPIRED',
]);

const defaultConfig: PickupConfigInput = {
  isOrderingOpen: false,
  eventName: '',
  streetAddress: '',
  asapWaitMinutes: 20,
  menuProductIds: [],
  taxRatePercent: 0,
};

function parseConfig(raw?: string): PickupConfigInput {
  if (!raw) return defaultConfig;
  try {
    const candidate = JSON.parse(raw) as Partial<PickupConfigInput>;
    return {
      isOrderingOpen: candidate.isOrderingOpen === true,
      eventName: typeof candidate.eventName === 'string' ? candidate.eventName.trim() : '',
      streetAddress: typeof candidate.streetAddress === 'string' ? candidate.streetAddress.trim() : '',
      asapWaitMinutes: Number.isInteger(candidate.asapWaitMinutes) ? Math.min(240, Math.max(1, candidate.asapWaitMinutes!)) : 20,
      menuProductIds: Array.isArray(candidate.menuProductIds)
        ? [...new Set(candidate.menuProductIds.filter((id): id is string => typeof id === 'string'))]
        : [],
      taxRatePercent: typeof candidate.taxRatePercent === 'number' && Number.isFinite(candidate.taxRatePercent)
        ? Math.min(25, Math.max(0, candidate.taxRatePercent))
        : 0,
    };
  } catch {
    // An invalid saved configuration must never inadvertently accept orders.
    logger.error('pickup_event_config contains invalid JSON; pickup ordering remains closed');
    return defaultConfig;
  }
}

async function loadConfig(): Promise<PickupConfigInput> {
  return parseConfig((await settingsRepo.findByKey(PICKUP_SETTING_KEY))?.settingValue);
}

function publicConfig(configured: PickupConfigInput, menu: Awaited<ReturnType<typeof getKioskMenu>>) {
  const enabledIds = new Set(configured.menuProductIds);
  return {
    isOrderingOpen: configured.isOrderingOpen,
    eventName: configured.eventName,
    streetAddress: configured.streetAddress,
    asapWaitMinutes: configured.asapWaitMinutes,
    taxRatePercent: configured.taxRatePercent,
    cardEnabled: Boolean(config.square.accessToken && config.square.applicationId && config.square.locationId),
    applicationId: config.square.applicationId || null,
    locationId: config.square.locationId || null,
    environment: config.square.environment,
    menu: {
      categories: menu.categories,
      products: menu.products.filter((product) => enabledIds.has(product.id)),
    },
  };
}

export async function getPublicPickupConfig() {
  const [configured, menu] = await Promise.all([loadConfig(), getKioskMenu()]);
  return publicConfig(configured, menu);
}

export async function getAdminPickupConfig() {
  const [configured, menu] = await Promise.all([loadConfig(), getKioskMenu()]);
  return { ...configured, menu };
}

export async function updatePickupConfig(input: PickupConfigInput) {
  const selected = new Set(input.menuProductIds);
  if (input.isOrderingOpen && selected.size === 0) {
    throw ApiError.badRequest('Select at least one available menu item before opening pickup ordering.');
  }
  // Only live kiosk/food menu products can be exposed through public pickup.
  const menu = await getKioskMenu();
  const available = new Set(menu.products.map((product) => product.id));
  if ([...selected].some((id) => !available.has(id))) {
    throw ApiError.badRequest('One or more selected menu items are unavailable.');
  }
  const settingValue = JSON.stringify({ ...input, menuProductIds: [...selected] });
  const existing = await settingsRepo.findByKey(PICKUP_SETTING_KEY);
  if (existing) {
    await settingsRepo.update(PICKUP_SETTING_KEY, {
      settingValue,
      label: 'Phone Pickup Event Configuration',
      category: 'pickup',
    });
  } else {
    await settingsRepo.create({
      settingKey: PICKUP_SETTING_KEY,
      settingValue,
      label: 'Phone Pickup Event Configuration',
      category: 'pickup',
    });
  }
  return getAdminPickupConfig();
}

function capabilityFor(orderId: string): string {
  const signature = crypto.createHmac('sha256', config.jwt.secret).update(`pickup-status:${orderId}`).digest('base64url');
  return `${orderId}.${signature}`;
}

function pickupSourceToken(slug: string) {
  return crypto.createHmac('sha256', config.jwt.secret).update(`pickup-source:event_qr:${slug}`).digest('base64url');
}

function validatedPickupChannel(input: PickupCheckoutInput): 'remote_pickup' | 'event_qr' {
  if (input.source !== 'event_qr') return 'remote_pickup';
  if (!input.sourceLinkSlug || !input.sourceToken) {
    throw ApiError.badRequest('The event QR source marker is incomplete.');
  }
  const expected = Buffer.from(pickupSourceToken(input.sourceLinkSlug));
  const received = Buffer.from(input.sourceToken);
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
    throw ApiError.badRequest('The event QR source marker is invalid.');
  }
  return 'event_qr';
}

export function verifyPickupCapability(capability: string): string | null {
  const dot = capability.indexOf('.');
  if (dot <= 0) return null;
  const orderId = capability.slice(0, dot);
  const signature = capability.slice(dot + 1);
  if (!/^[0-9a-f-]{36}$/i.test(orderId) || !/^[A-Za-z0-9_-]{40,}$/.test(signature)) return null;
  const expected = capabilityFor(orderId).slice(dot + 1);
  const received = Buffer.from(signature);
  const wanted = Buffer.from(expected);
  return received.length === wanted.length && crypto.timingSafeEqual(received, wanted) ? orderId : null;
}

async function pickupSystemUser() {
  let user = await prisma.siteUser.findFirst({
    where: { emailAddress: { equals: PICKUP_SYSTEM_EMAIL, mode: 'insensitive' }, isDeleted: false },
  });
  if (!user) {
    user = await prisma.siteUser.create({
      data: {
        emailAddress: PICKUP_SYSTEM_EMAIL,
        firstName: 'Phone',
        lastName: 'Pickup',
        passwordHash: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), config.bcrypt.saltRounds),
        isActive: false,
        isGuest: true,
        role: 'user',
      },
    });
  }
  return user;
}

function orderNumber(order: { kioskOrderNumber: string | null; id: string }): string {
  return order.kioskOrderNumber ?? `P-${order.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

/** Transport/provider-availability errors are intentionally not included. */
function isDefinitiveSquareDecline(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: unknown; errors?: Array<{ code?: unknown }> };
  const codes = [candidate.code, ...(candidate.errors ?? []).map((entry) => entry.code)];
  return codes.some((code) => typeof code === 'string' && DEFINITIVE_SQUARE_DECLINE_CODES.has(code));
}

async function voidUnpaidPickupOrder(orderId: string) {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`payment_inventory:${orderId}`}))`;
    const order = await tx.shopOrder.findUnique({
      where: { id: orderId },
      include: { orderStatus: true, payments: { select: { status: true } } },
    });
    if (!order) return;
    // A stale cancellation/rejection path must never restock an order that was
    // captured or authorized by a concurrent authoritative reconciliation.
    if (order.payments.some((payment) => ['authorized', 'captured'].includes(payment.status))) return;
    await tx.payment.updateMany({
      where: { orderId, status: 'pending' },
      data: { status: 'canceled' },
    });
    await restoreOrderInventoryOnceTx(tx, orderId, { trigger: 'kiosk_void' });
    const cancelled = await tx.orderStatus.findFirst({
      where: { status: { in: ['cancelled', 'canceled'], mode: 'insensitive' } },
    });
    if (cancelled && order.orderStatusId !== cancelled.id) {
      await tx.shopOrder.update({ where: { id: orderId }, data: { orderStatusId: cancelled.id } });
      await tx.orderStatusHistory.create({
        data: { orderId, oldStatusId: order.orderStatusId, newStatusId: cancelled.id, changedAt: new Date() },
      });
    }
  });
}

async function finalizeDefinitivePickupFailure(
  order: PickupOrder,
  payment: PickupOrder['payments'][number] | undefined,
) {
  if (!payment) return;
  const transitioned = await prisma.payment.updateMany({
    where: { id: payment.id, status: 'pending' },
    data: { status: 'failed' },
  });
  if (transitioned.count === 1) await voidUnpaidPickupOrder(order.id);
}

type PickupOrder = {
  id: string; grandTotal: unknown; currency: string; kioskOrderNumber: string | null;
  orderStatus: { status: string }; lines: Array<{ productNameSnapshot: string; qty: number; lineTotal: unknown; sideSelectionsText: string | null }>;
  payments: Array<{ id: string; status: string; providerTxnId: string | null; createdAt: Date; capturedAt: Date | null }>;
};

async function findPickupOrder(requestId: string): Promise<PickupOrder | null> {
  return (prisma.shopOrder as any).findUnique({
    where: { remotePickupRequestId: requestId },
    include: { orderStatus: true, lines: true, payments: { orderBy: { createdAt: 'desc' } } },
  });
}

type SquareAttemptLookup =
  | { outcome: 'found'; paymentId: string }
  | { outcome: 'not_found' }
  | { outcome: 'uncertain' };

/**
 * A successful empty Square search is materially different from a transport
 * error: only the former permits the browser to replay its same idempotency
 * key with a fresh one-time nonce.
 */
async function recoverSquarePaymentId(order: PickupOrder): Promise<SquareAttemptLookup> {
  const payment = order.payments[0];
  if (payment?.providerTxnId) return { outcome: 'found', paymentId: payment.providerTxnId };
  try {
    const response = await (getSquareClient().payments as any).list({
      locationId: config.square.locationId,
      beginTime: new Date((payment?.createdAt ?? new Date()).getTime() - 5 * 60_000).toISOString(),
      limit: 100,
    });
    const paymentId = response.payments?.find(
      (candidate: { referenceId?: string; id?: string }) => candidate.referenceId === order.id,
    )?.id;
    return paymentId ? { outcome: 'found', paymentId } : { outcome: 'not_found' };
  } catch (error) {
    logger.warn('Could not reconcile uncertain pickup payment', { orderId: order.id, error });
    return { outcome: 'uncertain' };
  }
}

async function finalizeCapturedPickupPayment(order: PickupOrder, paymentId: string, receiptUrl?: string) {
  const payment = order.payments[0];
  if (!payment) throw new Error('Pickup order has no payment record');
  const captured = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`pickup_payment:${order.id}`}))`;
    const current = await tx.payment.findUnique({
      where: { id: payment.id },
      include: { order: { include: { orderStatus: true } } },
    });
    if (!current) throw new Error('Pickup payment record disappeared during reconciliation');
    if (current.status === 'captured') return true;
    // Do not turn a locally cancelled/restocked order into a printable paid
    // order. New pickup orders are excluded from the generic sweeper; this is
    // a defensive guard for legacy/manual data and requires staff review.
    if (current.status !== 'pending' || current.order.orderStatus.status !== 'pending') return false;
    await tx.payment.update({
      where: { id: payment.id },
      data: { status: 'captured', providerTxnId: paymentId, capturedAt: new Date() },
    });
    return true;
  });
  if (!captured) {
    throw ApiError.unprocessable('The payment is confirmed by Square but the local order was already closed. Staff must reconcile it before preparation.');
  }
  void enqueueStaffOrderPush(order.id, 'remote_pickup_order_captured').catch((error) =>
    logger.warn('Failed to enqueue pickup staff push', { orderId: order.id, error }),
  );
  void enqueueCapturedOrderKitchenTickets(order.id).catch((error) =>
    logger.warn('Failed to enqueue pickup kitchen ticket', { orderId: order.id, error }),
  );
  return receiptUrl ?? null;
}

async function currentPickupStatus(order: PickupOrder) {
  const payment = order.payments[0];
  if (!payment) return { paymentStatus: 'pending' as const, receiptUrl: null, canReplay: false };
  if (payment.status === 'captured') return { paymentStatus: 'paid' as const, receiptUrl: null };
  if (payment.status === 'failed' || payment.status === 'canceled') {
    await voidUnpaidPickupOrder(order.id);
    return { paymentStatus: 'canceled' as const, receiptUrl: null };
  }
  const lookup = await recoverSquarePaymentId(order);
  if (lookup.outcome !== 'found') {
    return {
      paymentStatus: 'pending' as const,
      receiptUrl: null,
      // A provider search completed and found no payment. Replaying the
      // existing order-derived idempotency key is safe; changing request ID is not.
      canReplay: lookup.outcome === 'not_found',
    };
  }
  const providerId = lookup.paymentId;
  if (payment.providerTxnId !== providerId) {
    await prisma.payment.update({ where: { id: payment.id }, data: { providerTxnId: providerId } });
  }
  let live: Awaited<ReturnType<typeof squareService.getPayment>>;
  try {
    live = await squareService.getPayment(providerId);
  } catch (error) {
    // Provider connectivity is not a declined payment. Keep the durable
    // attempt pending and let a later capability poll reconcile it.
    logger.warn('Could not fetch authoritative pickup payment status', { orderId: order.id, providerId, error });
    return { paymentStatus: 'pending' as const, receiptUrl: null };
  }
  if (live.status === 'COMPLETED') {
    await finalizeCapturedPickupPayment(order, providerId, live.receiptUrl);
    return { paymentStatus: 'paid' as const, receiptUrl: live.receiptUrl ?? null };
  }
  if (live.status === 'FAILED' || live.status === 'CANCELED') {
    const transitioned = await prisma.payment.updateMany({
      where: { id: payment.id, status: 'pending' },
      data: { status: live.status === 'FAILED' ? 'failed' : 'canceled' },
    });
    if (transitioned.count === 1) await voidUnpaidPickupOrder(order.id);
    return { paymentStatus: 'canceled' as const, receiptUrl: null };
  }
  return { paymentStatus: 'pending' as const, receiptUrl: live.receiptUrl ?? null };
}

/**
 * Only used to repair an attempt whose request reached our database but whose
 * Square response was lost before its payment ID could be persisted. Square
 * receives the *same* order-derived idempotency key, so this is a lookup/replay
 * of one payment attempt rather than permission to charge again.
 */
async function replayUncertainSquareAttempt(order: PickupOrder, squareNonce: string) {
  const payment = order.payments[0];
  if (!payment || payment.providerTxnId) return currentPickupStatus(order);
  const result = await squareService.createPayment(
    Math.round(Number(order.grandTotal) * 100),
    order.currency,
    squareNonce,
    config.square.locationId,
    { orderId: order.id, userId: 'pickup-system' },
    `pickup-${order.id}`,
  );
  payment.providerTxnId = result.paymentId;
  const transitioned = await prisma.payment.updateMany({
    where: { id: payment.id, status: 'pending' },
    data: {
      providerTxnId: result.paymentId,
      status: result.status === 'FAILED' ? 'failed' : result.status === 'CANCELED' ? 'canceled' : 'pending',
    },
  });
  if (result.status === 'COMPLETED') {
    await finalizeCapturedPickupPayment(order, result.paymentId, result.receiptUrl);
    return { paymentStatus: 'paid' as const, receiptUrl: result.receiptUrl ?? null };
  }
  if (result.status === 'FAILED' || result.status === 'CANCELED') {
    if (transitioned.count === 1) await voidUnpaidPickupOrder(order.id);
    return { paymentStatus: 'canceled' as const, receiptUrl: null };
  }
  return { paymentStatus: 'pending' as const, receiptUrl: result.receiptUrl ?? null };
}

function present(order: PickupOrder, paymentStatus: 'paid' | 'pending' | 'canceled', receiptUrl: string | null) {
  return {
    orderNumber: orderNumber(order),
    capability: capabilityFor(order.id),
    paymentStatus,
    receiptUrl,
    status: order.orderStatus.status,
    grandTotal: Number(order.grandTotal),
    currency: order.currency,
    items: order.lines.map((line) => ({
      name: line.productNameSnapshot,
      qty: line.qty,
      sides: line.sideSelectionsText,
      lineTotal: Number(line.lineTotal),
    })),
  };
}

export async function createPickupOrder(input: PickupCheckoutInput) {
  // Idempotency is checked before availability or payment work. In particular,
  // an interrupted checkout must still be recoverable after staff closes the
  // event or changes its menu.
  const existing = await findPickupOrder(input.clientRequestId);
  if (existing) {
    const result = await currentPickupStatus(existing);
    if (
      result.paymentStatus === 'pending'
      && !existing.payments[0]?.providerTxnId
      // A fresh nonce may only be sent after Square's lookup definitively
      // found no original payment. Transport uncertainty remains locked.
      && 'canReplay' in result
      && result.canReplay === true
    ) {
      try {
        const replay = await replayUncertainSquareAttempt(existing, input.squareNonce);
        return present(existing, replay.paymentStatus, replay.receiptUrl);
      } catch (error) {
        if (isDefinitiveSquareDecline(error)) {
          await finalizeDefinitivePickupFailure(existing, existing.payments[0]);
          return present(existing, 'canceled', null);
        }
        logger.warn('Pickup payment replay response uncertain; preserving pending attempt', { orderId: existing.id, error });
      }
    }
    return present(existing, result.paymentStatus, result.receiptUrl);
  }

  const [configured, menu] = await Promise.all([loadConfig(), getKioskMenu()]);
  if (!configured.isOrderingOpen) throw ApiError.unprocessable('ASAP pickup ordering is currently closed.');
  if (!config.square.accessToken || !config.square.applicationId || !config.square.locationId) {
    throw ApiError.unprocessable('Card payments are not configured for pickup ordering.');
  }
  const enabledIds = new Set(configured.menuProductIds);
  const productByItemId = new Map(
    menu.products.flatMap((product) => product.items.map((item) => [item.id, product.id] as const)),
  );
  const mainItemUnavailable = input.lines.some((line) => {
    const productId = productByItemId.get(line.productItemId);
    return !productId || !enabledIds.has(productId);
  });
  const sideUnavailable = input.lines.flatMap((line) => line.sideProductIds ?? [])
    .some((productId) => !enabledIds.has(productId));
  if (mainItemUnavailable || sideUnavailable) {
    throw ApiError.unprocessable('One or more selected items are no longer available for this pickup event.');
  }

  const lines = await resolveComboSides(input.lines);
  const orderType = validatedPickupChannel(input);
  const user = await pickupSystemUser();
  let created: PickupOrder;
  try {
    created = await orderRepo.placeOrder(user.id, {
      lines,
      addresses: [{
        addressType: 'billing',
        fullName: input.customerName,
        phone: normalizePhone(input.customerPhone) ?? input.customerPhone,
        addressLine1: configured.streetAddress,
        city: process.env.STORE_SHIP_CITY ?? 'Pickup',
        postalCode: process.env.STORE_SHIP_ZIP ?? '00000',
        countryName: 'United States',
        countryIso2: 'US',
      }],
      currency: 'USD',
       orderType,
      fulfillmentType: 'pickup',
      eventName: configured.eventName,
      remotePickupRequestId: input.clientRequestId,
      specialInstructions: input.specialInstructions,
    } as unknown as CheckoutInput & { orderType: string; fulfillmentType: string; eventName: string; remotePickupRequestId: string }, 0, 0, {
      provider: 'square',
    }, configured.taxRatePercent) as unknown as PickupOrder;
  } catch (error: any) {
    if (error?.code === 'P2002') {
      const concurrent = await findPickupOrder(input.clientRequestId);
      if (concurrent) {
        const result = await currentPickupStatus(concurrent);
        return present(concurrent, result.paymentStatus, result.receiptUrl);
      }
    }
    throw error;
  }

  // placeOrder inserted this pending payment in the same transaction as the
  // order and inventory reservation. Never cross the Square boundary first.
  const payment = created.payments[0];
  if (!payment) throw ApiError.internal('Pickup payment reservation is missing.');

  try {
    const result = await squareService.createPayment(
      Math.round(Number(created.grandTotal) * 100),
      created.currency,
      input.squareNonce,
      config.square.locationId,
      { orderId: created.id, userId: user.id },
      `pickup-${created.id}`,
    );
    const transitioned = await prisma.payment.updateMany({
      where: { id: payment.id, status: 'pending' },
      data: {
        providerTxnId: result.paymentId,
        status: result.status === 'FAILED' ? 'failed' : result.status === 'CANCELED' ? 'canceled' : 'pending',
      },
    });
    created.payments[0]!.providerTxnId = result.paymentId;
    if (result.status === 'COMPLETED') {
      const receiptUrl = await finalizeCapturedPickupPayment(created, result.paymentId, result.receiptUrl);
      return present(created, 'paid', receiptUrl);
    }
    if (result.status === 'FAILED' || result.status === 'CANCELED') {
      if (transitioned.count === 1) await voidUnpaidPickupOrder(created.id);
      return present(created, 'canceled', null);
    }
    return present(created, 'pending', result.receiptUrl ?? null);
  } catch (error) {
    if (isDefinitiveSquareDecline(error)) {
      await finalizeDefinitivePickupFailure(created, payment);
      return present(created, 'canceled', null);
    }
    // Do not void stock or claim failure after a transport error: Square may
    // have accepted the stable idempotency key. The browser must retry this
    // same request ID or poll the returned capability, never start a new charge.
    logger.warn('Pickup payment response uncertain; leaving durable attempt pending', { orderId: created.id, error });
    throw ApiError.unprocessable('Payment is being confirmed. Do not submit another order; retry this checkout to safely check the existing attempt.');
  }
}

export async function getPickupOrderStatus(capability: string) {
  const id = verifyPickupCapability(capability);
  if (!id) throw ApiError.notFound('Pickup order');
  const order = await (prisma.shopOrder as any).findUnique({
    where: { id },
    include: { orderStatus: true, lines: true, payments: { orderBy: { createdAt: 'desc' } } },
  }) as PickupOrder | null;
  if (!order || !['remote_pickup', 'event_qr'].includes((order as any).orderType)) throw ApiError.notFound('Pickup order');
  const result = await currentPickupStatus(order);
  return present(order, result.paymentStatus, result.receiptUrl);
}

/**
 * Reload recovery for the browser-held checkout UUID. This identifier is
 * generated with crypto.randomUUID before the first POST and is therefore an
 * opaque 122-bit capability. Unlike checkout, this lookup never calls Square
 * and cannot initiate a new charge.
 */
export async function recoverPickupOrderAttempt(requestId: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) {
    throw ApiError.notFound('Pickup order');
  }
  const order = await findPickupOrder(requestId);
  // A payment cannot reach Square before the local order/payment reservation
  // transaction commits, so no local row definitively means no provider
  // attempt. The browser may submit again only with this same request ID.
  if (!order) return { found: false as const, canReplay: true };
  const result = await currentPickupStatus(order);
  return {
    found: true as const,
    ...present(order, result.paymentStatus, result.receiptUrl),
    canReplay: result.paymentStatus === 'pending' && 'canReplay' in result && result.canReplay === true,
  };
}