import { ApiError } from '../../utils/apiError';
import { ListOrdersInput, PlaceOrderInput, UpdateOrderStatusInput } from './orders.schema';
import { sendEmail } from '../../lib/mailer';
import { config } from '../../config';
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

export async function emailInvoice(orderId: string, emailTo: string) {
  const order = await repo.findOrderById(orderId);
  if (!order) throw ApiError.notFound('Order');

  const shortId = order.id.slice(-8).toUpperCase();
  const customer = [order.user?.firstName, order.user?.lastName].filter(Boolean).join(' ') || 'Customer';
  const fmtPrice = (p: unknown) => `$${Number(p ?? 0).toFixed(2)}`;
  const subject = `Invoice #${shortId} — The Jiggling Pig, LLC`;

  const lineRows = (order.lines ?? [])
    .map(
      (l) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee;">${l.productNameSnapshot || '—'}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;color:#8094ae;">${l.skuSnapshot || '—'}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${fmtPrice(l.unitPriceSnapshot)}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${l.qty}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${fmtPrice(l.lineTotal)}</td>
      </tr>`,
    )
    .join('');

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#f5f6fa;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f6fa;padding:40px 0;">
    <tr><td align="center">
      <table width="620" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr><td style="background:#1c2b46;padding:32px;text-align:center;">
          <img src="https://thejugglingpig.com/uploads/media/2026/03/79b614aa-f325-4b91-b81c-9a2c63aaa89a.png"
               alt="The Jiggling Pig" height="60" style="max-height:60px;" />
          <p style="color:#fff;margin:8px 0 0;font-size:18px;font-weight:bold;">The Jiggling Pig, LLC</p>
        </td></tr>
        <!-- Invoice meta -->
        <tr><td style="padding:32px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="vertical-align:top;">
                <p style="margin:0;font-size:11px;text-transform:uppercase;color:#8094ae;letter-spacing:1px;">Invoice To</p>
                <p style="margin:4px 0 0;font-size:16px;font-weight:bold;color:#1c2b46;">${customer}</p>
                <p style="margin:4px 0 0;color:#526484;">${emailTo}</p>
              </td>
              <td style="vertical-align:top;text-align:right;">
                <p style="margin:0;font-size:22px;font-weight:bold;color:#1c2b46;">Invoice</p>
                <p style="margin:4px 0 0;color:#526484;">Invoice #${shortId}</p>
                <p style="margin:4px 0 0;color:#526484;">${new Date(order.orderDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </td>
            </tr>
          </table>
        </td></tr>
        <!-- Line items -->
        <tr><td style="padding:0 32px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
            <thead>
              <tr style="background:#f5f6fa;">
                <th style="padding:10px 8px;text-align:left;font-size:12px;color:#8094ae;text-transform:uppercase;">Description</th>
                <th style="padding:10px 8px;text-align:left;font-size:12px;color:#8094ae;text-transform:uppercase;">SKU</th>
                <th style="padding:10px 8px;text-align:left;font-size:12px;color:#8094ae;text-transform:uppercase;">Unit Price</th>
                <th style="padding:10px 8px;text-align:left;font-size:12px;color:#8094ae;text-transform:uppercase;">Qty</th>
                <th style="padding:10px 8px;text-align:left;font-size:12px;color:#8094ae;text-transform:uppercase;">Amount</th>
              </tr>
            </thead>
            <tbody>${lineRows}</tbody>
          </table>
          <!-- Totals -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
            <tr><td colspan="3"></td><td style="padding:6px 8px;color:#526484;">Subtotal</td><td style="padding:6px 8px;text-align:right;">${fmtPrice(order.subtotal)}</td></tr>
            ${Number(order.discountTotal) > 0 ? `<tr><td colspan="3"></td><td style="padding:6px 8px;color:#526484;">Discount</td><td style="padding:6px 8px;text-align:right;color:#e85347;">-${fmtPrice(order.discountTotal)}</td></tr>` : ''}
            <tr><td colspan="3"></td><td style="padding:6px 8px;color:#526484;">Tax</td><td style="padding:6px 8px;text-align:right;">${fmtPrice(order.taxTotal)}</td></tr>
            ${Number(order.shippingTotal) > 0 ? `<tr><td colspan="3"></td><td style="padding:6px 8px;color:#526484;">Shipping</td><td style="padding:6px 8px;text-align:right;">${fmtPrice(order.shippingTotal)}</td></tr>` : ''}
            <tr style="border-top:2px solid #1c2b46;">
              <td colspan="3"></td>
              <td style="padding:10px 8px;font-weight:bold;color:#1c2b46;">Grand Total</td>
              <td style="padding:10px 8px;text-align:right;font-weight:bold;color:#1c2b46;font-size:16px;">${fmtPrice(order.grandTotal)}</td>
            </tr>
          </table>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f5f6fa;padding:24px;text-align:center;color:#8094ae;font-size:12px;">
          <p style="margin:0;">Invoice was created on a computer and is valid without the signature and seal.</p>
          <p style="margin:8px 0 0;">&copy; ${new Date().getFullYear()} The Jiggling Pig, LLC. All Rights Reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `Invoice #${shortId} — The Jiggling Pig, LLC\nTo: ${customer} <${emailTo}>\nGrand Total: ${fmtPrice(order.grandTotal)}`;

  const providerMessageId = await sendEmail({ to: emailTo, subject, html, text });

  await repo.createOutboxEmail({
    toAddress: emailTo,
    subject,
    bodyHtml: html,
    bodyText: text,
    payloadJson: JSON.stringify({ orderId, shortId }),
    providerMessageId,
  });

  return { sent: true, to: emailTo };
}

