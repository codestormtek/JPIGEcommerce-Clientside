import * as repo from '../modules/site-settings/site-settings.repository';
import * as stripeService from './stripeService';
import * as squareService from './squareService';
import { config } from '../config';
import { logger } from '../utils/logger';

/**
 * Payment gateway abstraction.
 *
 * All payment operations (create / capture / refund / get) should route
 * through this module. On each call it resolves the active gateway from the
 * `active_payment_gateway` site setting (cached with a short TTL) and
 * dispatches to the matching service, returning a normalized result so
 * callers never branch on gateway-specific response shapes.
 */

export type GatewayName = 'stripe' | 'square';

// ─── Active-gateway resolution (short-TTL cache) ──────────────────────────────

const GATEWAY_CACHE_TTL_MS = 30_000;
let cachedGateway: GatewayName | null = null;
let cachedAt = 0;

export async function getActiveGateway(): Promise<GatewayName> {
  const now = Date.now();
  if (cachedGateway && now - cachedAt < GATEWAY_CACHE_TTL_MS) {
    return cachedGateway;
  }
  const setting = await repo.findByKey('active_payment_gateway');
  cachedGateway = setting?.settingValue === 'square' ? 'square' : 'stripe';
  cachedAt = now;
  return cachedGateway;
}

/** Invalidate the cached gateway (call after switching gateways in admin). */
export function invalidateGatewayCache(): void {
  cachedGateway = null;
  cachedAt = 0;
}

// ─── Normalized result shapes ─────────────────────────────────────────────────

export type NormalizedPaymentStatus =
  | 'authorized'   // funds held, awaiting capture
  | 'captured'     // funds captured / completed
  | 'pending'      // processing
  | 'canceled'
  | 'failed';

export interface GatewayPaymentResult {
  gateway: GatewayName;
  /** Gateway-native payment identifier (Stripe pi_* / Square payment id) */
  paymentId: string;
  status: NormalizedPaymentStatus;
  /** Raw gateway status string, for logging/diagnostics */
  rawStatus: string;
  amountCents?: number;
  currency?: string;
  receiptUrl?: string;
}

export interface GatewayRefundResult {
  gateway: GatewayName;
  refundId: string;
  status: string;
}

function normalizeStripeStatus(status: string): NormalizedPaymentStatus {
  switch (status) {
    case 'requires_capture': return 'authorized';
    case 'succeeded': return 'captured';
    case 'canceled': return 'canceled';
    case 'processing': return 'pending';
    default: return 'pending';
  }
}

function normalizeSquareStatus(status: string): NormalizedPaymentStatus {
  switch (status) {
    case 'APPROVED': return 'authorized';
    case 'COMPLETED': return 'captured';
    case 'CANCELED': return 'canceled';
    case 'FAILED': return 'failed';
    case 'PENDING': return 'pending';
    default: return 'pending';
  }
}

function fromSquare(gatewayResult: squareService.SquarePaymentResult): GatewayPaymentResult {
  return {
    gateway: 'square',
    paymentId: gatewayResult.paymentId,
    status: normalizeSquareStatus(gatewayResult.status),
    rawStatus: gatewayResult.status,
    amountCents: gatewayResult.amountMoney.amount !== undefined
      ? Number(gatewayResult.amountMoney.amount)
      : undefined,
    currency: gatewayResult.amountMoney.currency ?? undefined,
    receiptUrl: gatewayResult.receiptUrl ?? undefined,
  };
}

// ─── Unified operations ───────────────────────────────────────────────────────

export interface CreateGatewayPaymentOptions {
  amountCents: number;
  currency: string;
  /** Stripe: PaymentMethod id (pm_*). Square: card token / source id (cnon_*). */
  sourceId?: string;
  metadata: { orderId: string; userId: string };
  /** Stripe-only: tax calculation id for Stripe Tax reporting */
  taxCalculationId?: string;
  /** Stable key for retry-safe payment creation. */
  idempotencyKey?: string;
}

export async function createPayment(options: CreateGatewayPaymentOptions): Promise<GatewayPaymentResult> {
  const gateway = await getActiveGateway();
  logger.debug('paymentGateway.createPayment dispatch', { gateway, orderId: options.metadata.orderId });

  if (gateway === 'square') {
    if (!options.sourceId) throw new Error('Square payments require a card token (sourceId)');
    const locationId = config.square?.locationId ?? process.env.SQUARE_LOCATION_ID ?? '';
    const result = await squareService.createPayment(
      options.amountCents,
      options.currency,
      options.sourceId,
      locationId,
      options.metadata,
      options.idempotencyKey,
    );
    return fromSquare(result);
  }

  const pi = await stripeService.createPaymentIntent(options.amountCents, options.currency, {
    paymentMethodId: options.sourceId,
    metadata: { order_id: options.metadata.orderId, user_id: options.metadata.userId },
    taxCalculationId: options.taxCalculationId,
    idempotencyKey: options.idempotencyKey,
  });
  return {
    gateway: 'stripe',
    paymentId: pi.id,
    status: normalizeStripeStatus(pi.status),
    rawStatus: pi.status,
    amountCents: pi.amount,
    currency: pi.currency?.toUpperCase(),
  };
}

export async function capturePayment(paymentId: string, gatewayOverride?: GatewayName): Promise<GatewayPaymentResult> {
  const gateway = gatewayOverride ?? await getActiveGateway();

  if (gateway === 'square') {
    const result = await squareService.capturePayment(paymentId);
    return fromSquare(result);
  }

  const pi = await stripeService.capturePaymentIntent(paymentId);
  return {
    gateway: 'stripe',
    paymentId: pi.id,
    status: normalizeStripeStatus(pi.status),
    rawStatus: pi.status,
    amountCents: pi.amount,
    currency: pi.currency?.toUpperCase(),
  };
}

export async function refundPayment(
  paymentId: string,
  amountCents: number,
  currency: string,
  options: { reason?: string; gatewayOverride?: GatewayName } = {},
): Promise<GatewayRefundResult> {
  const gateway = options.gatewayOverride ?? await getActiveGateway();

  if (gateway === 'square') {
    const result = await squareService.refundPayment(paymentId, amountCents, currency, options.reason);
    return { gateway: 'square', refundId: result.refundId, status: result.status };
  }

  const refund = await stripeService.createRefund(paymentId, amountCents);
  return { gateway: 'stripe', refundId: refund.id, status: refund.status ?? 'unknown' };
}

export async function getPayment(paymentId: string, gatewayOverride?: GatewayName): Promise<GatewayPaymentResult> {
  const gateway = gatewayOverride ?? await getActiveGateway();

  if (gateway === 'square') {
    const result = await squareService.getPayment(paymentId);
    return fromSquare(result);
  }

  const { stripe } = await import('../lib/stripe');
  const pi = await stripe.paymentIntents.retrieve(paymentId);
  return {
    gateway: 'stripe',
    paymentId: pi.id,
    status: normalizeStripeStatus(pi.status),
    rawStatus: pi.status,
    amountCents: pi.amount,
    currency: pi.currency?.toUpperCase(),
  };
}
