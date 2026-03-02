import Stripe from 'stripe';
import { config } from '../config';

/**
 * Singleton Stripe client.
 * Initialised once at module load time using the secret key from config.
 */
export const stripe = new Stripe(config.stripe.secretKey, {
  apiVersion: '2026-02-25.clover',
  typescript: true,
});

