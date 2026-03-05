import Stripe from 'stripe';
import { config } from '../config';
import { logger } from '../utils/logger';

let _stripe: Stripe | null = null;

if (config.stripe.secretKey) {
  _stripe = new Stripe(config.stripe.secretKey, {
    apiVersion: '2026-02-25.clover',
    typescript: true,
  });
} else {
  logger.warn('STRIPE_SECRET_KEY not set — payment features will be unavailable');
}

export function getStripe(): Stripe {
  if (!_stripe) {
    throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY to enable payment features.');
  }
  return _stripe;
}

export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return getStripe()[prop as keyof Stripe];
  },
});
