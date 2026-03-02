import { ApiError } from '../../utils/apiError';
import { ListOrdersInput, PlaceOrderInput, UpdateOrderStatusInput } from './orders.schema';
import * as repo from './orders.repository';
import * as userRepo from '../users/users.repository';
import * as paymentRepo from '../payments/payments.repository';
import * as stripeService from '../../services/stripeService';
import { validateCoupon, redeemCoupon } from '../promotions/promotions.service';
import { AuditContext, AuditAction, logAudit } from '../../utils/auditLogger';
import { logger } from '../../utils/logger';

// ─── User-facing ──────────────────────────────────────────────────────────────

export async function listMyOrders(userId: string, input: ListOrdersInput) {
  // Force-scope to the caller's own orders
  return repo.findOrders(input, userId);
}

export async function getMyOrderById(orderId: string, userId: string) {
  const order = await repo.findOrderByIdAndUser(orderId, userId);
  if (!order) throw ApiError.notFound('Order');
  return order;
}

export async function checkout(userId: string, input: PlaceOrderInput, ctx?: AuditContext) {
  try {
    // ── Step 1: Fetch product prices (needed for tax and/or coupon discount) ──
    let taxTotal = 0;
    let discountTotal = 0;

    const needsPrices = (config.stripe.taxEnabled || !!input.couponCode) && input.lines.length > 0;
    const priceMap = new Map<string, number>();

    if (needsPrices) {
      const itemIds = input.lines.map((l) => l.productItemId);
      const prices = await repo.findProductItemPrices(itemIds);
      prices.forEach((p) => priceMap.set(p.id, Number(p.price)));
    }

    // ── Step 1a: Calculate tax via Stripe Tax (optional, falls back to 0) ────
    if (config.stripe.taxEnabled && input.lines.length > 0) {
      const shippingAddr = input.addresses.find((a) => a.addressType === 'shipping');

      if (shippingAddr) {
        try {
          const lineItems = input.lines
            .map((l) => ({
              amount: Math.round((priceMap.get(l.productItemId) ?? 0) * l.qty * 100),
              reference: l.productItemId,
            }))
            .filter((li) => li.amount > 0);

          if (lineItems.length > 0) {
            const taxResult = await stripeService.calculateTax(
              lineItems,
              {
                country: shippingAddr.countryIso2 ?? 'US',
                postalCode: shippingAddr.postalCode ?? undefined,
                state: shippingAddr.region ?? undefined,
              },
              input.currency,
            );
            taxTotal = taxResult.taxAmountInCents / 100; // store as dollars in DB (Decimal)
          }
        } catch (taxErr: unknown) {
          logger.warn('Stripe Tax calculation failed, falling back to taxTotal=0', { taxErr });
        }
      }
    }

    // ── Step 1b: Validate coupon and compute discount ─────────────────────────
    if (input.couponCode) {
      const subtotal = input.lines.reduce(
        (sum, l) => sum + (priceMap.get(l.productItemId) ?? 0) * l.qty,
        0,
      );
      const couponResult = await validateCoupon({ code: input.couponCode, subtotal });
      discountTotal = couponResult.discountAmount;
    }

    // ── Step 2: Create the order in the database ──────────────────────────────
    const order = await repo.placeOrder(userId, input, taxTotal, discountTotal);

    // ── Step 2b: Record coupon redemption (fire-and-forget, non-blocking) ─────
    if (input.couponCode) {
      redeemCoupon(input.couponCode, order.id, userId).catch((err: unknown) => {
        logger.warn('Failed to record coupon redemption', { couponCode: input.couponCode, orderId: order.id, err });
      });
    }

    // ── Step 3: Create a Stripe PaymentIntent if a payment method was supplied ─
    if (input.paymentMethodTokenId) {
      const token = await userRepo.findPaymentMethodById(input.paymentMethodTokenId, userId);
      if (!token) {
        throw ApiError.unprocessable('Payment method not found or does not belong to this user');
      }

      const grandTotalCents = Math.round(Number(order.grandTotal) * 100);

      const pi = await stripeService.createPaymentIntent(grandTotalCents, order.currency, {
        paymentMethodId: token.token, // token.token holds the Stripe pm_* ID
        metadata: { orderId: order.id, userId },
      });

      await paymentRepo.createPayment({
        orderId: order.id,
        paymentMethodTokenId: token.id,
        provider: 'stripe',
        amount: Number(order.grandTotal),
        status: pi.status === 'requires_capture' ? 'authorized' : pi.status,
        providerTxnId: pi.id,
        authorizedAt: pi.status === 'requires_capture' ? new Date() : undefined,
      });
    }

    // ── Step 4: Audit log ─────────────────────────────────────────────────────
    logAudit({
      action: AuditAction.ORDER_PLACED,
      entityType: 'Order',
      entityId: order.id,
      ctx: { ...ctx, actorId: userId },
    });

    return order;
  } catch (err: unknown) {
    if (err instanceof ApiError) throw err;
    const msg = err instanceof Error ? err.message : 'Checkout failed';
    if (msg.includes('not found') || msg.includes('Insufficient stock')) {
      throw ApiError.unprocessable(msg);
    }
    throw ApiError.internal(msg);
  }
}

// ─── Admin-facing ─────────────────────────────────────────────────────────────

export async function listAllOrders(input: ListOrdersInput) {
  return repo.findOrders(input);
}

export async function getOrderById(orderId: string) {
  const order = await repo.findOrderById(orderId);
  if (!order) throw ApiError.notFound('Order');
  return order;
}

export async function changeOrderStatus(
  orderId: string,
  input: UpdateOrderStatusInput,
  changedByUserId: string,
  ctx?: AuditContext,
) {
  // Verify order exists and capture before state
  const before = await getOrderById(orderId);

  // Verify the target status exists
  const statuses = await repo.findAllStatuses();
  const valid = statuses.some((s) => s.id === input.statusId);
  if (!valid) throw ApiError.badRequest('Invalid order status ID');

  const after = await repo.updateOrderStatus(orderId, input.statusId, changedByUserId);
  logAudit({
    action: AuditAction.ORDER_STATUS_CHANGED,
    entityType: 'Order',
    entityId: orderId,
    beforeJson: { status: (before as { orderStatus?: { status?: string } }).orderStatus?.status },
    afterJson: { statusId: input.statusId },
    ctx: { ...ctx, actorId: changedByUserId },
  });
  return after;
}

// ─── Lookups ──────────────────────────────────────────────────────────────────

export async function listStatuses() {
  return repo.findAllStatuses();
}

export async function listShippingMethods() {
  return repo.findAllShippingMethods();
}

// ─── Invoice ──────────────────────────────────────────────────────────────────

type FullOrder = NonNullable<Awaited<ReturnType<typeof repo.findOrderById>>>;

function buildInvoice(order: FullOrder) {
  const n = (v: unknown) => Number(v);

  const billTo = order.addresses.find((a) => a.addressType === 'billing') ?? null;
  const shipTo = order.addresses.find((a) => a.addressType === 'shipping') ?? null;

  return {
    invoiceNumber: `INV-${order.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`,
    issuedAt: order.orderDate,
    currency: order.currency,
    status: order.orderStatus.status,
    orderType: order.orderType,
    specialInstructions: order.specialInstructions ?? null,

    billTo,
    shipTo,

    shippingMethod: order.shippingMethod?.name ?? null,

    lines: order.lines.map((line) => ({
      sku: line.skuSnapshot,
      name: line.productNameSnapshot,
      qty: line.qty,
      unitPrice: n(line.unitPriceSnapshot),
      lineTotal: n(line.lineTotal),
      options: line.options.map((o) => o.variationOption.value),
    })),

    totals: {
      subtotal: n(order.subtotal),
      discount: n(order.discountTotal),
      tax: n(order.taxTotal),
      shipping: n(order.shippingTotal),
      grand: n(order.grandTotal),
    },

    payments: order.payments.map((p) => ({
      provider: p.provider,
      amount: n(p.amount),
      status: p.status,
      capturedAt: p.capturedAt ?? null,
    })),
  };
}

export async function getMyInvoice(orderId: string, userId: string) {
  const order = await repo.findOrderByIdAndUser(orderId, userId);
  if (!order) throw ApiError.notFound('Order');
  return buildInvoice(order);
}

export async function getAdminInvoice(orderId: string) {
  const order = await repo.findOrderById(orderId);
  if (!order) throw ApiError.notFound('Order');
  return buildInvoice(order);
}

