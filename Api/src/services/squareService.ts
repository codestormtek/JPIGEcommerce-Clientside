import crypto from 'crypto';
import { getSquareClient } from '../lib/square';
import { logger } from '../utils/logger';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SquarePaymentResult {
  paymentId: string;
  status: string;
  amountMoney: { amount: bigint | undefined; currency: string | undefined };
  receiptUrl: string | undefined;
}

export interface SquareRefundResult {
  refundId: string;
  status: string;
}

// ─── Payments ─────────────────────────────────────────────────────────────────

export async function createPayment(
  amountCents: number,
  currency: string,
  sourceId: string,
  locationId: string,
  metadata: { orderId: string; userId: string },
): Promise<SquarePaymentResult> {
  const client = getSquareClient();
  const idempotencyKey = `${metadata.orderId}-${Date.now()}`;

  const response = await client.payments.createPayment({
    sourceId,
    idempotencyKey,
    amountMoney: { amount: BigInt(amountCents), currency: currency.toUpperCase() },
    locationId,
    note: `Order ${metadata.orderId}`,
    referenceId: metadata.orderId,
  });

  const payment = response.payment;
  if (!payment?.id) {
    throw new Error('Square createPayment returned no payment object');
  }

  logger.info('Square payment created', { squarePaymentId: payment.id, orderId: metadata.orderId });

  return {
    paymentId: payment.id,
    status: payment.status ?? 'UNKNOWN',
    amountMoney: {
      amount: payment.amountMoney?.amount,
      currency: payment.amountMoney?.currency,
    },
    receiptUrl: payment.receiptUrl,
  };
}

// ─── Refunds ──────────────────────────────────────────────────────────────────

export async function refundPayment(
  squarePaymentId: string,
  amountCents: number,
  currency: string,
  reason?: string,
): Promise<SquareRefundResult> {
  const client = getSquareClient();
  const idempotencyKey = `refund-${squarePaymentId}-${Date.now()}`;

  const response = await client.refunds.refundPayment({
    paymentId: squarePaymentId,
    idempotencyKey,
    amountMoney: { amount: BigInt(amountCents), currency: currency.toUpperCase() },
    reason: reason ?? 'Customer request',
  });

  const refund = response.refund;
  if (!refund?.id) {
    throw new Error('Square refundPayment returned no refund object');
  }

  logger.info('Square refund created', { squareRefundId: refund.id, squarePaymentId });

  return {
    refundId: refund.id,
    status: refund.status ?? 'UNKNOWN',
  };
}

// ─── Webhook signature verification ───────────────────────────────────────────

export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string,
  signatureKey: string,
  notificationUrl: string,
): boolean {
  try {
    const message = notificationUrl + rawBody;
    const hmac = crypto.createHmac('sha256', signatureKey);
    hmac.update(message);
    const expected = hmac.digest('base64');

    const expectedBuf = Buffer.from(expected);
    const receivedBuf = Buffer.from(signatureHeader);

    if (expectedBuf.length !== receivedBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, receivedBuf);
  } catch {
    return false;
  }
}
