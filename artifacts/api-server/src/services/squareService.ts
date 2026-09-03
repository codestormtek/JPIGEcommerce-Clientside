import crypto from 'crypto';
import type { Square } from 'square';
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
  // Square caps idempotency_key at 45 chars; order IDs are long, so use a UUID (36 chars).
  const idempotencyKey = crypto.randomUUID();

  const response = await client.payments.create({
    sourceId,
    idempotencyKey,
    amountMoney: { amount: BigInt(amountCents), currency: currency.toUpperCase() as Square.Currency },
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
      amount: payment.amountMoney?.amount ?? undefined,
      currency: payment.amountMoney?.currency,
    },
    receiptUrl: payment.receiptUrl,
  };
}

// ─── Capture & lookup ─────────────────────────────────────────────────────────

/**
 * Complete (capture) a previously authorized Square payment.
 * Square payments created with `autocomplete: false` sit in APPROVED status
 * until completed. If the payment is already COMPLETED this is a no-op that
 * returns the current state.
 */
export async function capturePayment(squarePaymentId: string): Promise<SquarePaymentResult> {
  const client = getSquareClient();

  const current = await client.payments.get({ paymentId: squarePaymentId });
  if (current.payment?.status === 'COMPLETED') {
    return toPaymentResult(current.payment);
  }

  const response = await client.payments.complete({ paymentId: squarePaymentId });
  const payment = response.payment;
  if (!payment?.id) {
    throw new Error('Square capturePayment returned no payment object');
  }

  logger.info('Square payment captured', { squarePaymentId: payment.id });
  return toPaymentResult(payment);
}

/** Fetch the current state of a Square payment. */
export async function getPayment(squarePaymentId: string): Promise<SquarePaymentResult> {
  const client = getSquareClient();
  const response = await client.payments.get({ paymentId: squarePaymentId });
  const payment = response.payment;
  if (!payment?.id) {
    throw new Error(`Square payment not found: ${squarePaymentId}`);
  }
  return toPaymentResult(payment);
}

function toPaymentResult(payment: Square.Payment): SquarePaymentResult {
  return {
    paymentId: payment.id as string,
    status: payment.status ?? 'UNKNOWN',
    amountMoney: {
      amount: payment.amountMoney?.amount ?? undefined,
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
  idempotencyKey: string = crypto.randomUUID(),
): Promise<SquareRefundResult> {
  const client = getSquareClient();

  const response = await client.refunds.refundPayment({
    paymentId: squarePaymentId,
    idempotencyKey,
    amountMoney: { amount: BigInt(amountCents), currency: currency.toUpperCase() as Square.Currency },
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

export async function getRefund(squareRefundId: string): Promise<SquareRefundResult> {
  const response = await getSquareClient().refunds.get({ refundId: squareRefundId });
  const refund = response.refund;
  if (!refund?.id) throw new Error(`Square refund not found: ${squareRefundId}`);
  return { refundId: refund.id, status: refund.status ?? 'UNKNOWN' };
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
