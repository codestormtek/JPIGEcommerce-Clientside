import { ApiError } from '../../utils/apiError';
import { AuditContext, AuditAction, logAudit } from '../../utils/auditLogger';
import { ListPaymentsInput } from './payments.schema';
import * as repo from './payments.repository';
import * as stripeService from '../../services/stripeService';
import { logger } from '../../utils/logger';

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

  // Call Stripe to actually capture the funds
  if (payment.providerTxnId) {
    try {
      await stripeService.capturePaymentIntent(payment.providerTxnId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Stripe capture failed';
      throw ApiError.unprocessable(`Stripe capture failed: ${msg}`);
    }
  }

  const updated = await repo.capturePayment(id);

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

  // Call Stripe to issue the refund
  if (payment.providerTxnId) {
    try {
      await stripeService.createRefund(payment.providerTxnId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Stripe refund failed';
      throw ApiError.unprocessable(`Stripe refund failed: ${msg}`);
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

