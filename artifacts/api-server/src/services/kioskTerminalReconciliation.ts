import prisma from '../lib/prisma';
import { logger } from '../utils/logger';
import { sendNewOrderStoreAlerts } from '../modules/order-notifications/order-notifications.service';
import { enqueueStaffOrderPush } from './expoPushNotifications';
import { config } from '../config';
import { enqueuePaidStaffOrderNotificationsTx } from './staffOrderNotifications';

async function sendPaidKioskStoreAlert(orderId: string): Promise<void> {
  const order = await prisma.shopOrder.findUnique({
    where: { id: orderId },
    include: { lines: true },
  });
  if (!order) return;
  await sendNewOrderStoreAlerts({
    orderNumber: `ORD-${order.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`,
    // This legacy fallback can appear on a staff lock screen. Do not expose
    // kiosk customer contact details in it.
    customerName: 'Kiosk customer',
    customerPhone: null,
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

/**
 * Shared terminal completion boundary for kiosk polling and staff detail.
 * Exactly one caller can win pending -> captured; only that caller schedules
 * the paid-order store alert. Repeated calls are safe and may enrich a
 * previously captured row with Square's payment ID without notifying again.
 */
export async function reconcileCompletedKioskTerminalPayment(
  paymentId: string,
  orderId: string,
  squarePaymentId?: string | null,
): Promise<{ capturedNow: boolean }> {
  const transitioned = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`kiosk_payment:${paymentId}`}))`;
    const won = await tx.payment.updateMany({
      where: { id: paymentId, status: 'pending' },
      data: {
        status: 'captured',
        capturedAt: new Date(),
        ...(squarePaymentId ? { providerTxnId: squarePaymentId } : {}),
      },
    });
    if (won.count === 1) {
      await enqueuePaidStaffOrderNotificationsTx(tx, orderId, 'kiosk');
      return true;
    }

    // Do not alter a terminal checkout reference once a payment has advanced
    // beyond capture; for an already captured record, enrich it with Square's
    // definitive payment ID so staff receipt lookups are possible.
    if (squarePaymentId) {
      await tx.payment.updateMany({
        where: { id: paymentId, status: 'captured' },
        data: { providerTxnId: squarePaymentId },
      });
    }
    return false;
  });

  if (transitioned) {
    // Compatibility during rollout: the existing direct kiosk SMS remains
    // active until durable staff SMS is explicitly enabled. Once enabled, only
    // the outbox path is used; an enqueue failure must never fall back to a
    // second, potentially duplicate direct provider request.
    if (!config.staffOrderNotifications.smsEnabled && config.env === 'production') {
      void sendPaidKioskStoreAlert(orderId).catch((error) =>
        logger.warn(`Paid kiosk store alert failed for order ${orderId}: ${error}`),
      );
    }
  }
  // Also repair a prior process failure between capture and outbox insertion.
  // The durable unique event key keeps repeat reconciliation from double-sending.
  void prisma.payment.findFirst({ where: { id: paymentId, status: 'captured' }, select: { id: true } })
    .then((captured) => captured
      ? enqueueStaffOrderPush(orderId, 'kiosk_order_captured')
      : undefined)
    .catch((error) => logger.warn(`Paid kiosk push enqueue failed for order ${orderId}: ${error}`));
  return { capturedNow: transitioned };
}