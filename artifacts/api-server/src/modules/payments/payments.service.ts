import { ApiError } from '../../utils/apiError';
import { AuditContext, AuditAction, logAudit } from '../../utils/auditLogger';
import { ListPaymentsInput } from './payments.schema';
import * as repo from './payments.repository';
import * as paymentGateway from '../../services/paymentGateway';
import { logger } from '../../utils/logger';
import prisma from '../../lib/prisma';
import { getSquareClient } from '../../lib/square';
import * as squareService from '../../services/squareService';
import { restoreOrderInventoryOnceTx } from '../../services/orderInventoryRestoration';
import { reconcileCompletedKioskTerminalPayment } from '../../services/kioskTerminalReconciliation';
import { CreateStaffRefundInput, StaffPaymentsListInput } from './payments.schema';
import { enqueueStaffOrderPush } from '../../services/expoPushNotifications';

// ─── Payments (admin) ─────────────────────────────────────────────────────────

export async function listPayments(input: ListPaymentsInput) {
  return repo.findPayments(input);
}

export async function getPaymentById(id: string) {
  const payment = await repo.findPaymentById(id);
  if (!payment) throw ApiError.notFound('Payment');
  return payment;
}

export async function capturePayment(id: string, ctx?: AuditContext) {
  const payment = await repo.findPaymentById(id);
  if (!payment) throw ApiError.notFound('Payment');
  if (payment.status !== 'authorized') {
    throw ApiError.unprocessable(`Payment cannot be captured in status "${payment.status}"`);
  }

  // Route capture to the gateway that created the payment (stored gatewayName),
  // not the currently-active one — the admin may have switched gateways since.
  if (payment.providerTxnId) {
    const gatewayName: paymentGateway.GatewayName = payment.provider === 'square' ? 'square' : 'stripe';
    try {
      await paymentGateway.capturePayment(payment.providerTxnId, gatewayName);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Capture failed';
      throw ApiError.unprocessable(`${gatewayName === 'square' ? 'Square' : 'Stripe'} capture failed: ${msg}`);
    }
  }

  const updated = await repo.capturePayment(id);
  const capturedOrder = await prisma.shopOrder.findUnique({
    where: { id: payment.orderId },
    select: { id: true, orderType: true },
  });
  if (capturedOrder?.orderType === 'kiosk') {
    enqueueStaffOrderPush(capturedOrder.id, 'kiosk_order_captured').catch((error) =>
      logger.warn('Failed to enqueue captured kiosk push', { orderId: capturedOrder.id, error }),
    );
  }

  logAudit({
    action: AuditAction.PAYMENT_CAPTURED,
    entityType: 'Payment',
    entityId: id,
    beforeJson: { status: payment.status },
    afterJson: { status: updated.status, capturedAt: updated.capturedAt },
    ctx,
  });

  return updated;
}

export async function refundPayment(id: string, ctx?: AuditContext) {
  const payment = await repo.findPaymentById(id);
  if (!payment) throw ApiError.notFound('Payment');
  if (payment.status !== 'captured') {
    throw ApiError.unprocessable(`Payment cannot be refunded in status "${payment.status}"`);
  }

  // Route refund to the gateway that created the payment (stored gatewayName)
  if (payment.providerTxnId) {
    const gatewayName: paymentGateway.GatewayName = payment.provider === 'square' ? 'square' : 'stripe';
    try {
      await paymentGateway.refundPayment(
        payment.providerTxnId,
        Math.round(Number(payment.amount) * 100),
        'USD',
        { reason: 'Admin-initiated refund', gatewayOverride: gatewayName },
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Refund failed';
      throw ApiError.unprocessable(`${gatewayName === 'square' ? 'Square' : 'Stripe'} refund failed: ${msg}`);
    }
  }

  const updated = await repo.refundPayment(id);

  logAudit({
    action: AuditAction.PAYMENT_REFUNDED,
    entityType: 'Payment',
    entityId: id,
    beforeJson: { status: payment.status },
    afterJson: { status: updated.status },
    ctx,
  });

  return updated;
}

const staffPaymentInclude = {
  order: {
    include: {
      addresses: { where: { addressType: 'billing' }, take: 1 },
      orderStatus: { select: { status: true } },
      lines: {
        include: {
          options: { include: { variationOption: { select: { value: true } } } },
          menuOptions: { include: { menuOption: { select: { name: true } } } },
        },
      },
    },
  },
  refunds: { include: { inventoryRestoration: true }, orderBy: { createdAt: 'desc' as const } },
} as const;

function squarePaymentId(payment: { providerTxnId: string | null }): string | null {
  const value = payment.providerTxnId;
  if (!value || value.startsWith('checkout:') || value.startsWith('order:')) return null;
  return value;
}

function checkoutId(payment: { providerTxnId: string | null }): string | null {
  const value = payment.providerTxnId;
  if (!value || value.startsWith('order:')) return null;
  return value.startsWith('checkout:') ? value.slice(9) : null;
}

function refundDto(refund: {
  id: string; paymentId: string; actorAdminId: string; provider: string;
  providerRefundId: string | null; providerStatus: string; reason: string;
  amountCents: number; currency: string; idempotencyRequestId: string;
  restoreInventory: boolean; inventoryRestoration: unknown | null; createdAt: Date; updatedAt: Date;
}) {
  return {
    id: refund.id,
    paymentId: refund.paymentId,
    actorAdminId: refund.actorAdminId,
    provider: refund.provider,
    providerRefundId: refund.providerRefundId,
    providerStatus: refund.providerStatus,
    reason: refund.reason,
    amount: { amountCents: refund.amountCents, currency: refund.currency },
    requestId: refund.idempotencyRequestId,
    restoreInventory: refund.restoreInventory,
    inventoryRestored: Boolean(refund.inventoryRestoration),
    createdAt: refund.createdAt,
    updatedAt: refund.updatedAt,
  };
}

function staffPaymentDto(
  payment: Awaited<ReturnType<typeof prisma.payment.findFirst>> & {
    order: {
      id: string; kioskOrderNumber: string | null; currency: string;
      orderStatus: { status: string };
      addresses: Array<{ fullName: string | null; phone: string | null }>;
      lines: Array<{
        productNameSnapshot: string; qty: number; sideSelectionsText: string | null;
        options: Array<{ variationOption: { value: string } }>;
        menuOptions: Array<{ menuOption: { name: string } }>;
      }>;
    };
    refunds: Array<Parameters<typeof refundDto>[0]>;
  },
  liveProviderStatus: string | null = null,
  receiptUrl: string | null = null,
) {
  const completedRefundCents = payment.refunds
    .filter((r) => r.providerStatus === 'COMPLETED')
    .reduce((sum, r) => sum + r.amountCents, 0);
  const amountCents = Math.round(Number(payment.amount) * 100);
  return {
    id: payment.id,
    orderId: payment.orderId,
    orderNumber: payment.order.kioskOrderNumber,
    orderStatus: payment.order.orderStatus.status,
    provider: payment.provider,
    localStatus: payment.status,
    liveProviderStatus,
    amount: { amountCents, currency: payment.order.currency },
    refundedAmount: { amountCents: completedRefundCents, currency: payment.order.currency },
    refundableAmount: { amountCents: Math.max(0, amountCents - completedRefundCents), currency: payment.order.currency },
    receiptUrl: receiptUrl?.startsWith('https://') ? receiptUrl : null,
    customerName: payment.order.addresses[0]?.fullName ?? null,
    customerPhone: payment.order.addresses[0]?.phone ?? null,
    items: payment.order.lines.map((line) => ({
      productName: line.productNameSnapshot,
      quantity: line.qty,
      selectedSides: line.sideSelectionsText,
      options: [
        ...line.options.map((option) => option.variationOption.value),
        ...line.menuOptions.map((option) => option.menuOption.name),
      ],
    })),
    createdAt: payment.createdAt,
    capturedAt: payment.capturedAt,
    canCancel: payment.status === 'pending' && payment.provider === 'square_terminal' && Boolean(checkoutId(payment)),
    canRefund: ['captured', 'partially_refunded'].includes(payment.status) && completedRefundCents < amountCents,
    refunds: payment.refunds.map(refundDto),
  };
}

export async function getStaffPaymentDashboard() {
  // Keep dashboard totals self-healing even if Square's webhook was missed.
  // The cap and worker limit bound both latency and Square API pressure.
  const pendingRefunds = await prisma.paymentRefund.findMany({
    where: {
      provider: 'square',
      providerStatus: 'PENDING',
      payment: { order: { orderType: 'kiosk' } },
    },
    select: { id: true },
    orderBy: { updatedAt: 'asc' },
    take: 20,
  });
  await reconcilePendingRefundIdsBounded(pendingRefunds.map((refund) => refund.id));

  const where = { order: { orderType: 'kiosk' } };
  const [pendingCount, capturedCount, failedCount, refundedCount, captured, refunds] = await Promise.all([
    prisma.payment.count({ where: { ...where, status: 'pending' } }),
    prisma.payment.count({ where: { ...where, status: { in: ['captured', 'partially_refunded'] } } }),
    prisma.payment.count({ where: { ...where, status: { in: ['failed', 'canceled'] } } }),
    prisma.payment.count({ where: { ...where, status: 'refunded' } }),
    prisma.payment.aggregate({ where: { ...where, status: { in: ['captured', 'partially_refunded', 'refunded'] } }, _sum: { amount: true } }),
    prisma.paymentRefund.aggregate({ where: { payment: where, providerStatus: 'COMPLETED' }, _sum: { amountCents: true } }),
  ]);
  return {
    pendingCount, capturedCount, failedCount, refundedCount,
    capturedTotal: { amountCents: Math.round(Number(captured._sum.amount ?? 0) * 100), currency: 'USD' },
    refundedTotal: { amountCents: refunds._sum.amountCents ?? 0, currency: 'USD' },
  };
}

export async function listStaffPayments(input: StaffPaymentsListInput) {
  const { page, limit, status, search, from, to } = input;
  const where = {
    order: {
      orderType: 'kiosk',
      ...(search ? {
        OR: [
          { kioskOrderNumber: { contains: search, mode: 'insensitive' as const } },
          { addresses: { some: { fullName: { contains: search, mode: 'insensitive' as const } } } },
        ],
      } : {}),
    },
    ...(status ? { status } : {}),
    ...(from || to ? { createdAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } } : {}),
  };
  const pagePayments = await prisma.payment.findMany({
    where,
    include: staffPaymentInclude,
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
  });
  await reconcilePendingRefundIdsBounded(pagePayments.flatMap((payment) =>
    payment.refunds
      .filter((refund) => refund.provider === 'square' && refund.providerStatus === 'PENDING')
      .map((refund) => refund.id),
  ));
  // Re-run both queries because a completed full refund can change the payment
  // status and therefore membership of a status-filtered page.
  const [data, total] = await Promise.all([
    prisma.payment.findMany({ where, include: staffPaymentInclude, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
    prisma.payment.count({ where }),
  ]);
  return { data: data.map((p) => staffPaymentDto(p)), total, page, limit, totalPages: Math.ceil(total / limit) };
}

async function requireKioskPayment(id: string) {
  const payment = await prisma.payment.findFirst({
    where: { id, order: { orderType: 'kiosk' } },
    include: staffPaymentInclude,
  });
  if (!payment) throw ApiError.notFound('Kiosk payment');
  return payment;
}

export async function getStaffPayment(id: string) {
  let payment = await requireKioskPayment(id);
  // This independent reconciliation covers a response/webhook outage after
  // Square accepted a refund. It is intentionally run before calculating the
  // staff response so rejected/failed refunds stop reserving refund capacity.
  for (const refund of payment.refunds) {
    if (refund.provider === 'square' && refund.providerStatus === 'PENDING') {
      await reconcilePendingSquareRefund(refund.id);
    }
  }
  payment = await requireKioskPayment(id);
  if (['captured', 'partially_refunded'].includes(payment.status)) {
    void enqueueStaffOrderPush(payment.orderId, 'kiosk_order_captured').catch((error) =>
      logger.warn('Failed to repair captured kiosk push', { orderId: payment.orderId, error }),
    );
  }
  let liveStatus: string | null = null;
  let receiptUrl: string | null = null;
  try {
    const providerPaymentId = squarePaymentId(payment);
    if (providerPaymentId && payment.provider.startsWith('square')) {
      const live = await squareService.getPayment(providerPaymentId);
      liveStatus = live.status;
      receiptUrl = live.receiptUrl ?? null;
      if (live.status === 'COMPLETED' && payment.status === 'pending') {
        await prisma.payment.update({ where: { id }, data: { status: 'captured', capturedAt: new Date() } });
        await enqueueStaffOrderPush(payment.orderId, 'kiosk_order_captured');
        payment = await requireKioskPayment(id);
      }
    } else {
      const terminalCheckoutId = checkoutId(payment);
      if (terminalCheckoutId) {
        const response = await getSquareClient().terminal.checkouts.get({ checkoutId: terminalCheckoutId });
        liveStatus = response.checkout?.status ?? 'UNKNOWN';
        if (liveStatus === 'COMPLETED') {
          const terminalPaymentId = response.checkout?.paymentIds?.[0] ?? null;
          await reconcileCompletedKioskTerminalPayment(payment.id, payment.orderId, terminalPaymentId);
          payment = await requireKioskPayment(id);
          if (terminalPaymentId) {
            const live = await squareService.getPayment(terminalPaymentId);
            liveStatus = live.status;
            receiptUrl = live.receiptUrl ?? null;
          }
        }
      }
    }
  } catch (error) {
    logger.error('Square live payment lookup failed', { paymentId: id, error });
    throw ApiError.unprocessable('Square payment status is temporarily unavailable');
  }
  return staffPaymentDto(payment, liveStatus, receiptUrl);
}

/**
 * Active recovery boundary for a local pending Square refund. The transaction
 * intentionally holds the per-payment/refund advisory locks while asking
 * Square, so staff polling and webhook finalization cannot race a reissue.
 * Square receives the original persisted idempotency key on every reissue.
 */
export async function reconcilePendingSquareRefund(refundId: string): Promise<void> {
  const outcome = await prisma.$transaction(async (tx) => {
    let refund = await tx.paymentRefund.findUnique({
      where: { id: refundId },
      include: { payment: true },
    });
    if (!refund || refund.provider !== 'square' || refund.providerStatus !== 'PENDING') {
      return { completed: false, refundId: null as string | null };
    }
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`payment_refund:${refund.paymentId}`}))`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`square_refund:${refund.id}`}))`;
    refund = await tx.paymentRefund.findUnique({
      where: { id: refundId },
      include: { payment: true },
    });
    if (!refund || refund.provider !== 'square' || refund.providerStatus !== 'PENDING') {
      return { completed: false, refundId: null as string | null };
    }

    let result;
    try {
      result = refund.providerRefundId
        ? await squareService.getRefund(refund.providerRefundId)
        : await squareService.refundPayment(
            squarePaymentId(refund.payment) ?? (() => { throw ApiError.unprocessable('Square payment ID is unavailable for refund reconciliation'); })(),
            refund.amountCents,
            refund.currency,
            refund.reason,
            refund.idempotencyRequestId,
          );
    } catch (error) {
      logger.warn('Pending Square refund reconciliation failed', { refundId, error });
      throw ApiError.unprocessable('Square refund status is temporarily unavailable');
    }
    await tx.paymentRefund.update({
      where: { id: refund.id },
      data: { providerRefundId: result.refundId, providerStatus: result.status },
    });
    return { completed: result.status === 'COMPLETED', refundId: refund.id };
  });
  if (outcome.completed && outcome.refundId) {
    await finalizeConfirmedSquareRefund(outcome.refundId);
  }
}

async function reconcilePendingRefundIdsBounded(refundIds: string[], concurrency = 3): Promise<void> {
  const ids = [...new Set(refundIds)];
  let nextIndex = 0;
  const worker = async () => {
    while (nextIndex < ids.length) {
      const refundId = ids[nextIndex++];
      if (!refundId) continue;
      try {
        await reconcilePendingSquareRefund(refundId);
      } catch (error) {
        // One temporarily unavailable Square lookup must not make the entire
        // staff list/dashboard unavailable; a later poll retries idempotently.
        logger.warn('Staff refund polling reconciliation deferred', { refundId, error });
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, ids.length) }, worker));
}

export async function cancelStaffPayment(id: string, ctx: AuditContext) {
  const payment = await requireKioskPayment(id);
  const terminalCheckoutId = checkoutId(payment);
  if (
    payment.provider !== 'square_terminal'
    || !['pending', 'canceled'].includes(payment.status)
    || !terminalCheckoutId
  ) {
    throw ApiError.unprocessable('Only a pending Square Terminal checkout can be canceled');
  }
  const client = getSquareClient();
  const current = await client.terminal.checkouts.get({ checkoutId: terminalCheckoutId });
  let squareStatus = current.checkout?.status ?? 'UNKNOWN';
  if (['PENDING', 'IN_PROGRESS'].includes(squareStatus)) {
    const canceled = await client.terminal.checkouts.cancel({ checkoutId: terminalCheckoutId });
    squareStatus = canceled.checkout?.status ?? 'UNKNOWN';
  }
  if (squareStatus !== 'CANCELED') {
    throw ApiError.unprocessable(`Square Terminal checkout is not pending or canceled (${squareStatus})`);
  }

  // This is intentionally retryable. A request that observes Square CANCELED
  // can repair any missing local effects left by an earlier process failure.
  await finalizeCanceledTerminalPayment(id, ctx);
  return getStaffPayment(id);
}

/**
 * Applies every local effect of a Square Terminal cancellation atomically.
 * Exported as a narrow, deterministic transaction boundary for focused tests:
 * callers may invoke it repeatedly and the unique restoration invariant makes
 * stock increments exactly once.
 */
export async function finalizeCanceledTerminalPayment(id: string, ctx: AuditContext) {
  return prisma.$transaction(async (tx) => {
    const initial = await tx.payment.findUnique({
      where: { id },
      select: { orderId: true },
    });
    if (!initial) throw ApiError.notFound('Kiosk payment');

    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`payment_inventory:${initial.orderId}`}))`;
    const current = await tx.payment.findUnique({
      where: { id },
      include: { order: true },
    });
    if (!current) throw ApiError.notFound('Kiosk payment');
    if (current.provider !== 'square_terminal' || !['pending', 'canceled'].includes(current.status)) {
      throw ApiError.unprocessable('Only a pending or canceled Square Terminal payment can be finalized');
    }

    const canceledStatus = await tx.orderStatus.findFirst({
      where: { status: { in: ['cancelled', 'canceled'], mode: 'insensitive' } },
    });
    if (!canceledStatus) throw ApiError.internal('The canceled order status is not configured');

    const paymentChanged = current.status === 'pending';
    if (paymentChanged) {
      await tx.payment.update({ where: { id }, data: { status: 'canceled' } });
    }
    const inventoryRestored = await restoreOrderInventoryOnceTx(tx, current.orderId, {
      trigger: 'terminal_cancel',
      actorAdminId: ctx.actorId,
    });
    const orderChanged = current.order.orderStatusId !== canceledStatus.id;
    if (orderChanged) {
      await tx.shopOrder.update({
        where: { id: current.orderId },
        data: { orderStatusId: canceledStatus.id },
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId: current.orderId,
          oldStatusId: current.order.orderStatusId,
          newStatusId: canceledStatus.id,
          changedAt: new Date(),
          changedByUserId: ctx.actorId,
        },
      });
    }
    if (paymentChanged || inventoryRestored || orderChanged) {
      await tx.auditLog.create({
        data: {
          userId: ctx.actorId ?? null,
          action: AuditAction.PAYMENT_CANCELED,
          entityType: 'Payment',
          entityId: id,
          beforeJson: JSON.stringify({
            paymentStatus: current.status,
            orderStatusId: current.order.orderStatusId,
          }),
          afterJson: JSON.stringify({
            paymentStatus: 'canceled',
            orderStatus: canceledStatus.status,
            squareStatus: 'CANCELED',
            inventoryRestored,
            inventoryBehavior: 'complete order inventory restored once per order',
          }),
          ip: ctx.ip ?? null,
          userAgent: ctx.userAgent ?? null,
        },
      });
    }
    return { paymentChanged, inventoryRestored, orderChanged };
  });
}

async function finalizeConfirmedSquareRefund(refundId: string, ctx?: AuditContext) {
  return prisma.$transaction(async (tx) => {
    const refund = await tx.paymentRefund.findUnique({
      where: { id: refundId },
      include: { payment: { include: { order: true } } },
    });
    if (!refund) throw ApiError.notFound('Payment refund');

    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`payment_refund:${refund.paymentId}`}))`;
    await tx.paymentRefund.update({
      where: { id: refund.id },
      data: { providerStatus: 'COMPLETED' },
    });
    if (refund.restoreInventory) {
      await restoreOrderInventoryOnceTx(tx, refund.payment.orderId, {
        trigger: 'refund', refundId: refund.id, actorAdminId: refund.actorAdminId,
      });
    }

    const totals = await tx.paymentRefund.aggregate({
      where: { paymentId: refund.paymentId, providerStatus: 'COMPLETED' },
      _sum: { amountCents: true },
    });
    const fullyRefunded = (totals._sum.amountCents ?? 0) >= Math.round(Number(refund.payment.amount) * 100);
    const nextPaymentStatus = fullyRefunded ? 'refunded' : 'partially_refunded';
    const beforePaymentStatus = refund.payment.status;
    await tx.payment.update({ where: { id: refund.paymentId }, data: { status: nextPaymentStatus } });

    if (fullyRefunded) {
      const refundedStatus = await tx.orderStatus.findFirst({
        where: { status: 'refunded' },
      });
      if (!refundedStatus) throw ApiError.internal('The refunded order status is not configured');
      if (refund.payment.order.orderStatusId !== refundedStatus.id) {
        await tx.shopOrder.update({
          where: { id: refund.payment.orderId },
          data: { orderStatusId: refundedStatus.id },
        });
        await tx.orderStatusHistory.create({
          data: {
            orderId: refund.payment.orderId,
            oldStatusId: refund.payment.order.orderStatusId,
            newStatusId: refundedStatus.id,
            changedAt: new Date(),
            changedByUserId: ctx?.actorId ?? refund.actorAdminId,
          },
        });
      }
    }

    await tx.auditLog.create({
      data: {
        userId: ctx?.actorId ?? refund.actorAdminId,
        action: AuditAction.PAYMENT_REFUNDED,
        entityType: 'PaymentRefund',
        entityId: refund.id,
        beforeJson: JSON.stringify({ paymentStatus: beforePaymentStatus }),
        afterJson: JSON.stringify({
          providerRefundId: refund.providerRefundId,
          providerStatus: 'COMPLETED',
          paymentStatus: nextPaymentStatus,
          orderStatus: fullyRefunded ? 'refunded' : refund.payment.order.orderStatusId,
          inventoryBehavior: refund.restoreInventory
            ? 'complete order inventory restored once per order'
            : 'inventory restoration not requested',
        }),
        ip: ctx?.ip ?? null,
        userAgent: ctx?.userAgent ?? null,
      },
    });
    return { fullyRefunded, paymentId: refund.paymentId };
  });
}

export async function createStaffPaymentRefund(id: string, input: CreateStaffRefundInput, ctx: AuditContext) {
  const payment = await requireKioskPayment(id);
  if (!['square', 'square_terminal'].includes(payment.provider)) {
    throw ApiError.unprocessable('Staff refunds are supported only for Square payments');
  }
  const providerPaymentId = squarePaymentId(payment);
  if (!providerPaymentId || !['captured', 'partially_refunded', 'refunded'].includes(payment.status)) {
    throw ApiError.unprocessable('The Square payment is not captured and cannot be refunded');
  }

  let record = await prisma.paymentRefund.findUnique({ where: { idempotencyRequestId: input.requestId } });
  if (record && (record.paymentId !== id || record.amountCents !== input.amountCents || record.reason !== input.reason || record.restoreInventory !== input.restoreInventory)) {
    throw ApiError.conflict('The refund request ID was already used with different refund details');
  }
  if (!record) {
    record = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`payment_refund:${id}`}))`;
      const raced = await tx.paymentRefund.findUnique({
        where: { idempotencyRequestId: input.requestId },
      });
      if (raced) return raced;
      const committed = await tx.paymentRefund.aggregate({
        where: { paymentId: id, providerStatus: { in: ['PENDING', 'COMPLETED'] } },
        _sum: { amountCents: true },
      });
      const paymentCents = Math.round(Number(payment.amount) * 100);
      if (input.amountCents > paymentCents - (committed._sum.amountCents ?? 0)) {
        throw ApiError.unprocessable('Refund amount exceeds the remaining refundable amount');
      }
      return tx.paymentRefund.create({
        data: {
          paymentId: id, actorAdminId: ctx.actorId!, provider: 'square',
          providerStatus: 'PENDING', reason: input.reason, amountCents: input.amountCents,
          currency: payment.order.currency, idempotencyRequestId: input.requestId,
          restoreInventory: input.restoreInventory,
        },
      });
    });
    if (record.paymentId !== id || record.amountCents !== input.amountCents || record.reason !== input.reason || record.restoreInventory !== input.restoreInventory) {
      throw ApiError.conflict('The refund request ID was already used with different refund details');
    }
    logAudit({ action: AuditAction.PAYMENT_REFUND_REQUESTED, entityType: 'PaymentRefund', entityId: record.id, afterJson: { paymentId: id, amountCents: input.amountCents, reason: input.reason, restoreInventory: input.restoreInventory }, ctx });
  }

  let result;
  try {
    result = record.providerRefundId
      ? await squareService.getRefund(record.providerRefundId)
      : await squareService.refundPayment(providerPaymentId, record.amountCents, record.currency, record.reason, record.idempotencyRequestId);
  } catch (error) {
    logger.error('Square refund request failed', { paymentId: id, refundId: record.id, error });
    throw ApiError.unprocessable(`Square refund could not be confirmed: ${error instanceof Error ? error.message : 'unknown error'}`);
  }
  record = await prisma.paymentRefund.update({
    where: { id: record.id },
    data: { providerRefundId: result.refundId, providerStatus: result.status },
  });
  if (result.status === 'COMPLETED') {
    await finalizeConfirmedSquareRefund(record.id, ctx);
    record = (await prisma.paymentRefund.findUnique({ where: { id: record.id } }))!;
  }
  const responseRecord = await prisma.paymentRefund.findUnique({
    where: { id: record.id },
    include: { inventoryRestoration: true },
  });
  if (!responseRecord) throw ApiError.notFound('Payment refund');
  return refundDto(responseRecord);
}

// ─── Webhook event handlers ───────────────────────────────────────────────────

export async function handlePaymentIntentSucceeded(providerTxnId: string): Promise<void> {
  const payment = await repo.findPaymentByProviderTxnId(providerTxnId);
  if (!payment) {
    logger.warn('Webhook: payment_intent.succeeded — no matching payment record', { providerTxnId });
    return;
  }
  if (payment.status !== 'captured') {
    await repo.updatePaymentStatus(payment.id, 'captured', { capturedAt: new Date() });
    logger.info('Webhook: payment captured via webhook', { paymentId: payment.id });
  }
  const order = await prisma.shopOrder.findUnique({
    where: { id: payment.orderId },
    select: { orderType: true },
  });
  if (order?.orderType === 'kiosk') {
    await enqueueStaffOrderPush(payment.orderId, 'kiosk_order_captured');
  }
}

export async function handlePaymentIntentFailed(providerTxnId: string): Promise<void> {
  const payment = await repo.findPaymentByProviderTxnId(providerTxnId);
  if (!payment) {
    logger.warn('Webhook: payment_intent.payment_failed — no matching payment record', { providerTxnId });
    return;
  }
  await repo.updatePaymentStatus(payment.id, 'failed');
  logAudit({
    action: AuditAction.PAYMENT_FAILED,
    entityType: 'Payment',
    entityId: payment.id,
    afterJson: { status: 'failed', providerTxnId },
  });
  logger.warn('Webhook: payment failed', { paymentId: payment.id });
}

export async function handleChargeRefunded(providerTxnId: string): Promise<void> {
  const payment = await repo.findPaymentByProviderTxnId(providerTxnId);
  if (!payment) {
    logger.warn('Webhook: charge.refunded — no matching payment record', { providerTxnId });
    return;
  }
  if (payment.status !== 'refunded') {
    await repo.updatePaymentStatus(payment.id, 'refunded');
    logger.info('Webhook: payment refunded via webhook', { paymentId: payment.id });
  }
}

// ─── Square webhook event handlers ───────────────────────────────────────────

export async function handleSquarePaymentCompleted(squarePaymentId: string, _status: string): Promise<void> {
  const payment = await repo.findPaymentByProviderTxnId(squarePaymentId);
  if (!payment) {
    logger.warn('Square webhook: payment.completed — no matching payment record', { squarePaymentId });
    return;
  }
  if (payment.status !== 'captured') {
    await repo.updatePaymentStatus(payment.id, 'captured', { capturedAt: new Date() });
    logger.info('Square webhook: payment marked captured', { paymentId: payment.id });
  }
  const order = await prisma.shopOrder.findUnique({
    where: { id: payment.orderId },
    select: { orderType: true },
  });
  if (order?.orderType === 'kiosk') {
    await enqueueStaffOrderPush(payment.orderId, 'kiosk_order_captured');
  }
}

export async function handleSquarePaymentFailed(squarePaymentId: string): Promise<void> {
  const payment = await repo.findPaymentByProviderTxnId(squarePaymentId);
  if (!payment) {
    logger.warn('Square webhook: payment.failed — no matching payment record', { squarePaymentId });
    return;
  }
  await repo.updatePaymentStatus(payment.id, 'failed');
  logAudit({
    action: AuditAction.PAYMENT_FAILED,
    entityType: 'Payment',
    entityId: payment.id,
    afterJson: { status: 'failed', squarePaymentId },
  });
  logger.warn('Square webhook: payment failed', { paymentId: payment.id });
}

export async function handleSquareRefundUpdated(
  squarePaymentId: string,
  squareRefundId: string,
  squareStatus: string,
): Promise<void> {
  // Never infer ownership from payment ID or an unassigned local row: Square
  // webhooks are only authoritative for a refund ID we persisted on response.
  const refund = await prisma.paymentRefund.findUnique({
    where: { providerRefundId: squareRefundId },
  });
  if (!refund) {
    logger.warn('Square webhook: unmatched/external refund ignored', { squarePaymentId, squareRefundId });
    return;
  }
  const payment = await repo.findPaymentByProviderTxnId(squarePaymentId);
  if (!payment || payment.id !== refund.paymentId) {
    logger.warn('Square webhook: refund payment mismatch ignored', { squarePaymentId, squareRefundId });
    return;
  }
  const shouldFinalize = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`payment_refund:${refund.paymentId}`}))`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`square_refund:${refund.id}`}))`;
    const current = await tx.paymentRefund.findUnique({ where: { id: refund.id } });
    if (!current) return false;
    const terminalStatuses = new Set(['COMPLETED', 'FAILED', 'REJECTED']);
    // Square can redeliver older refund.created/refund.updated events. Once a
    // terminal status is persisted, never regress or switch it.
    if (terminalStatuses.has(current.providerStatus)) {
      return current.providerStatus === 'COMPLETED' && squareStatus === 'COMPLETED';
    }
    await tx.paymentRefund.update({
      where: { id: refund.id },
      data: { providerStatus: squareStatus || 'UNKNOWN' },
    });
    return squareStatus === 'COMPLETED';
  });
  if (shouldFinalize) {
    const result = await finalizeConfirmedSquareRefund(refund.id);
    logger.info('Square webhook: durable refund confirmed', {
      paymentId: result.paymentId,
      squareRefundId,
      status: result.fullyRefunded ? 'refunded' : 'partially_refunded',
    });
  }
}

