import { Request, Response } from 'express';
import { AuthRequest } from '../../types';
import { sendSuccess, sendPaginated } from '../../utils/apiResponse';
import { ctxFromRequest } from '../../utils/auditLogger';
import { ListPaymentsInput } from './payments.schema';
import * as service from './payments.service';
import * as stripeService from '../../services/stripeService';
import { config } from '../../config';
import { logger } from '../../utils/logger';

// ─── Admin handlers ───────────────────────────────────────────────────────────

// GET /api/v1/payments
export async function listPayments(req: AuthRequest, res: Response): Promise<void> {
  const result = await service.listPayments(req.query as unknown as ListPaymentsInput);
  sendPaginated(res, result);
}

// GET /api/v1/payments/:id
export async function getPaymentById(req: AuthRequest, res: Response): Promise<void> {
  const payment = await service.getPaymentById(req.params['id'] as string);
  sendSuccess(res, payment);
}

// PATCH /api/v1/payments/:id/capture
export async function capturePayment(req: AuthRequest, res: Response): Promise<void> {
  const payment = await service.capturePayment(
    req.params['id'] as string,
    ctxFromRequest(req, req.user?.sub),
  );
  sendSuccess(res, payment, 'Payment captured');
}

// PATCH /api/v1/payments/:id/refund
export async function refundPayment(req: AuthRequest, res: Response): Promise<void> {
  const payment = await service.refundPayment(
    req.params['id'] as string,
    ctxFromRequest(req, req.user?.sub),
  );
  sendSuccess(res, payment, 'Payment refunded');
}

// POST /api/v1/payments/webhook  (no auth — verified by Stripe signature)
export async function handleWebhook(req: Request, res: Response): Promise<void> {
  const sig = req.headers['stripe-signature'];

  if (!sig || !config.stripe.webhookSecret) {
    res.status(400).json({ error: 'Missing Stripe signature or webhook secret' });
    return;
  }

  let event;
  try {
    event = stripeService.constructWebhookEvent(
      req.body as Buffer,
      typeof sig === 'string' ? sig : sig[0]!,
      config.stripe.webhookSecret,
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Webhook signature verification failed';
    logger.warn('Stripe webhook signature verification failed', { msg });
    res.status(400).json({ error: msg });
    return;
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object as { id: string };
        await service.handlePaymentIntentSucceeded(pi.id);
        break;
      }
      case 'payment_intent.payment_failed': {
        const pi = event.data.object as { id: string };
        await service.handlePaymentIntentFailed(pi.id);
        break;
      }
      case 'charge.refunded': {
        const charge = event.data.object as { payment_intent: string | null };
        if (charge.payment_intent) {
          await service.handleChargeRefunded(charge.payment_intent);
        }
        break;
      }
      default:
        logger.debug('Unhandled Stripe webhook event', { type: event.type });
    }
  } catch (err: unknown) {
    logger.error('Error processing Stripe webhook event', { type: event.type, err });
    res.status(500).json({ error: 'Webhook processing failed' });
    return;
  }

  res.json({ received: true });
}

