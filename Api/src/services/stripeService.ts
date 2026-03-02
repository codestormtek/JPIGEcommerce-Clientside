import Stripe from 'stripe';
import { stripe } from '../lib/stripe';
import { config } from '../config';
import { logger } from '../utils/logger';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TaxCalculationResult {
  /** Tax amount in cents (e.g. 120 = $1.20) */
  taxAmountInCents: number;
  /** Stripe Tax Calculation ID — store for compliance / reconciliation */
  calculationId: string;
}

export interface CreatePaymentIntentOptions {
  /** Stripe Payment Method ID (pm_*) — if provided, the PI is confirmed immediately */
  paymentMethodId?: string;
  /** Arbitrary key/value pairs attached to the PI for reconciliation */
  metadata?: Record<string, string>;
}

// ─── Payment Intents ──────────────────────────────────────────────────────────

/**
 * Create a Stripe PaymentIntent in manual-capture mode (authorize → capture).
 *
 * When `paymentMethodId` is supplied the PI is confirmed server-side using
 * `off_session: true` so no browser redirect is required. If the card requires
 * 3-D Secure the call will throw a StripeCardError — callers must handle it.
 *
 * @param amountInCents  Grand total in the smallest currency unit (cents for USD)
 * @param currency       ISO 4217 currency code (e.g. 'USD')
 * @param options        Optional payment method and metadata
 */
export async function createPaymentIntent(
  amountInCents: number,
  currency: string,
  options: CreatePaymentIntentOptions = {},
): Promise<Stripe.PaymentIntent> {
  const params: Stripe.PaymentIntentCreateParams = {
    amount: amountInCents,
    currency: currency.toLowerCase(),
    capture_method: 'manual', // two-step: authorize now, capture later
    metadata: options.metadata ?? {},
  };

  if (options.paymentMethodId) {
    params.payment_method = options.paymentMethodId;
    params.confirm = true;
    params.off_session = true; // merchant-initiated; bypasses 3DS redirect
  }

  return stripe.paymentIntents.create(params);
}

/**
 * Capture a previously authorized PaymentIntent.
 */
export async function capturePaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
  return stripe.paymentIntents.capture(paymentIntentId);
}

/**
 * Create a refund against a PaymentIntent.
 *
 * @param paymentIntentId  Stripe PI ID (pi_*)
 * @param amountInCents    Optional partial refund amount; omit for full refund
 */
export async function createRefund(
  paymentIntentId: string,
  amountInCents?: number,
): Promise<Stripe.Refund> {
  const params: Stripe.RefundCreateParams = { payment_intent: paymentIntentId };
  if (amountInCents !== undefined) params.amount = amountInCents;
  return stripe.refunds.create(params);
}

// ─── Stripe Tax ───────────────────────────────────────────────────────────────

export interface TaxLineItem {
  /** Amount in cents */
  amount: number;
  /** Product ID or SKU used for Stripe Tax reporting */
  reference: string;
}

export interface ShippingAddress {
  country: string;   // ISO 3166-1 alpha-2, e.g. 'US'
  postalCode?: string;
  state?: string;    // State / province code
}

/**
 * Calculate sales tax using Stripe Tax.
 * Returns zero tax when `STRIPE_TAX_ENABLED` is false so callers need not branch.
 *
 * Throws if Stripe Tax is enabled but the calculation fails (the caller should
 * catch and decide whether to fall back to zero-tax or surface an error).
 */
export async function calculateTax(
  lineItems: TaxLineItem[],
  shippingAddress: ShippingAddress,
  currency: string,
): Promise<TaxCalculationResult> {
  if (!config.stripe.taxEnabled) {
    return { taxAmountInCents: 0, calculationId: '' };
  }

  logger.debug('Calculating tax via Stripe Tax', { lineItems, shippingAddress, currency });

  const calculation = await stripe.tax.calculations.create({
    currency: currency.toLowerCase(),
    line_items: lineItems.map((li) => ({
      amount: li.amount,
      reference: li.reference,
      tax_behavior: 'exclusive' as const,
    })),
    customer_details: {
      address: {
        country: shippingAddress.country,
        postal_code: shippingAddress.postalCode,
        state: shippingAddress.state,
      },
      address_source: 'shipping' as const,
    },
  });

  return {
    taxAmountInCents: calculation.tax_amount_exclusive,
    calculationId: calculation.id ?? '',
  };
}

// ─── Webhooks ─────────────────────────────────────────────────────────────────

/**
 * Validate and parse an incoming Stripe webhook event.
 * Throws `Stripe.errors.StripeSignatureVerificationError` if the signature is invalid.
 */
export function constructWebhookEvent(
  rawBody: Buffer,
  signature: string,
  webhookSecret: string,
): Stripe.Event {
  return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
}

