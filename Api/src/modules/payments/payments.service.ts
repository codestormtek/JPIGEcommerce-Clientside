import { ApiError } from '../../utils/apiError';
import { AuditContext, AuditAction, logAudit } from '../../utils/auditLogger';
import { ListPaymentsInput } from './payments.schema';
import * as repo from './payments.repository';
import * as stripeService from '../../services/stripeService';
import * as squareService from '../../services/squareService';
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

  // Route capture to the correct gateway
  if (payment.providerTxnId) {
    if (payment.provider === 'square') {
      // Square payments auto-capture (COMPLETED status); no additional capture step needed
      logger.info('Square payment already captured at creation — skipping capture call', { paymentId: payment.id });
    } else {
      try {
        await stripeService.capturePaymentIntent(payment.providerTxnId);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Stripe capture failed';
        throw ApiError.unprocessable(`Stripe capture failed: ${msg}`);
      }
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

  // Route refund to the correct gateway
  if (payment.providerTxnId) {
    if (payment.provider === 'square') {
      try {
        await squareService.refundPayment(
          payment.providerTxnId,
          Math.round(Number(payment.amount) * 100),
          'USD',
          'Admin-initiated refund',
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Square refund failed';
        throw ApiError.unprocessable(`Square refund failed: ${msg}`);
      }
    } else {
      try {
        await stripeService.createRefund(payment.providerTxnId);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Stripe refund failed';
        throw ApiError.unprocessable(`Stripe refund failed: ${msg}`);
      }
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

export async function handleSquareRefundCompleted(squareRefundId: string): Promise<void> {
  // Square refunds reference payment IDs indirectly; look up by refund ID pattern
  const payment = await repo.findPaymentByProviderTxnId(squareRefundId);
  if (!payment) {
    logger.warn('Square webhook: refund.completed — no matching payment record', { squareRefundId });
    return;
  }
  if (payment.status !== 'refunded') {
    await repo.updatePaymentStatus(payment.id, 'refunded');
    logger.info('Square webhook: payment marked refunded', { paymentId: payment.id });
  }
}

