import { Request, Response } from 'express';
import { AuthRequest } from '../../types';
import { sendSuccess, sendPaginated } from '../../utils/apiResponse';
import { ctxFromRequest } from '../../utils/auditLogger';
import {
  CreateStaffRefundInput,
  ListPaymentsInput,
  StaffPaymentsListInput,
} from './payments.schema';
import * as service from './payments.service';
import * as stripeService from '../../services/stripeService';
import * as squareService from '../../services/squareService';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { getActiveGateway } from '../../services/paymentGateway';

// ─── Public handlers ──────────────────────────────────────────────────────────

// GET /api/v1/payments/gateway-config  (no auth)
// Returns the active gateway plus the PUBLIC Square identifiers the storefront
// needs to render the Square Web Payments SDK. Never expose secrets here.
export async function getGatewayConfig(_req: Request, res: Response): Promise<void> {
  const gateway = await getActiveGateway();
  sendSuccess(res, {
    gateway,
    squareApplicationId: config.square.applicationId || undefined,
    squareLocationId: config.square.locationId || undefined,
    squareEnvironment: config.square.environment || undefined,
  });
}

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

export async function getStaffPaymentDashboard(_req: AuthRequest, res: Response): Promise<void> {
  sendSuccess(res, await service.getStaffPaymentDashboard());
}

export async function listStaffPayments(req: AuthRequest, res: Response): Promise<void> {
  sendPaginated(res, await service.listStaffPayments(req.query as unknown as StaffPaymentsListInput));
}

export async function getStaffPayment(req: AuthRequest, res: Response): Promise<void> {
  sendSuccess(res, await service.getStaffPayment(req.params['paymentId'] as string));
}

export async function cancelStaffPayment(req: AuthRequest, res: Response): Promise<void> {
  sendSuccess(
    res,
    await service.cancelStaffPayment(
      req.params['paymentId'] as string,
      ctxFromRequest(req, req.user!.sub),
    ),
    'Terminal checkout canceled',
  );
}

export async function createStaffPaymentRefund(req: AuthRequest, res: Response): Promise<void> {
  sendSuccess(
    res,
    await service.createStaffPaymentRefund(
      req.params['paymentId'] as string,
      req.body as CreateStaffRefundInput,
      ctxFromRequest(req, req.user!.sub),
    ),
  );
}

// POST /api/v1/payments/square-webhook  (no auth — verified by Square HMAC)
export async function handleSquareWebhook(req: Request, res: Response): Promise<void> {
  const sig = req.headers['x-square-hmacsha256-signature'] as string | undefined;
  const signatureKey = config.square.webhookSignatureKey;

  if (!sig || !signatureKey) {
    logger.warn('Square webhook: missing signature or key');
    res.status(400).json({ error: 'Missing Square signature or webhook key' });
    return;
  }

  // Route is registered with express.raw(), so body is a Buffer of the exact
  // bytes Square signed — required for HMAC verification to match.
  const rawBody = Buffer.isBuffer(req.body)
    ? req.body.toString('utf8')
    : typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  const notificationUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

  const isValid = squareService.verifyWebhookSignature(rawBody, sig, signatureKey, notificationUrl);
  if (!isValid) {
    logger.warn('Square webhook: invalid signature');
    res.status(400).json({ error: 'Square webhook signature verification failed' });
    return;
  }

  // Square event shape: { type, data: { object: { payment?: {...}, refund?: {...} } } }
  let event: {
    type?: string;
    data?: {
      object?: {
        payment?: { id?: string; status?: string };
        refund?: { id?: string; payment_id?: string; status?: string };
      };
    };
  };
  try {
    event = JSON.parse(rawBody) as typeof event;
  } catch {
    res.status(400).json({ error: 'Invalid JSON body' });
    return;
  }

  try {
    const eventType = event?.type ?? '';
    const paymentId = event?.data?.object?.payment?.id ?? '';
    const paymentStatus = event?.data?.object?.payment?.status ?? '';
    const refundPaymentId = event?.data?.object?.refund?.payment_id ?? '';
    const refundId = event?.data?.object?.refund?.id ?? '';
    const refundStatus = event?.data?.object?.refund?.status ?? '';

    switch (eventType) {
      case 'payment.completed':
        if (paymentId) await service.handleSquarePaymentCompleted(paymentId, paymentStatus);
        break;
      case 'payment.failed':
        if (paymentId) await service.handleSquarePaymentFailed(paymentId);
        break;
      case 'refund.created':
      case 'refund.updated':
        // Refund events reference the original payment via payment_id
        if (refundPaymentId && refundId && refundStatus) {
          await service.handleSquareRefundUpdated(refundPaymentId, refundId, refundStatus);
        }
        break;
      default:
        logger.debug('Unhandled Square webhook event', { type: eventType });
    }
  } catch (err: unknown) {
    logger.error('Error processing Square webhook event', { type: event?.type, err });
    res.status(500).json({ error: 'Webhook processing failed' });
    return;
  }

  res.json({ received: true });
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

