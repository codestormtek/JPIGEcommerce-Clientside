import prisma from '../lib/prisma';
import { logger } from '../utils/logger';
import { normalizePhone } from '../lib/phone';
import { sendNewOrderStoreAlerts } from '../modules/order-notifications/order-notifications.service';

async function sendPaidKioskStoreAlert(orderId: string): Promise<void> {
  const order = await prisma.shopOrder.findUnique({
    where: { id: orderId },
    include: { addresses: true, lines: true },
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
    if (won.count === 1) return true;

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
    void sendPaidKioskStoreAlert(orderId).catch((error) =>
      logger.warn(`Paid kiosk store alert failed for order ${orderId}: ${error}`),
    );
  }
  return { capturedNow: transitioned };
}