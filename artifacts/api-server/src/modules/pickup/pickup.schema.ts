import { z } from 'zod';
import { normalizePhone } from '../../lib/phone';

const lineSchema = z.object({
  productItemId: z.string().min(1),
  qty: z.number().int().positive().max(50),
  sideProductIds: z.array(z.string().min(1)).max(10).optional(),
});

export const pickupCheckoutSchema = z.object({
  // This key is generated once by the browser and is persisted before it sends
  // a card token. Repeating it can only resume the same Square payment attempt.
  clientRequestId: z.string().uuid(),
  lines: z.array(lineSchema).min(1).max(50),
  // Optional while older pickup clients roll out. New clients send the cents
  // total shown on the reviewed checkout screen.
  expectedTotalCents: z.number().int().nonnegative().max(100_000_000).optional(),
  customerName: z.string().trim().min(1, 'Your name is required').max(100),
  customerPhone: z.string().trim().max(30)
    .refine((value) => normalizePhone(value) !== null, 'Enter a valid US phone number'),
  specialInstructions: z.string().trim().max(500).optional(),
  squareNonce: z.string().min(1, 'A card payment is required'),
  source: z.enum(['remote', 'event_qr']).optional(),
  sourceLinkSlug: z.string().trim().toLowerCase().max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  sourceToken: z.string().regex(/^[A-Za-z0-9_-]{40,}$/).optional(),
}).superRefine((value, ctx) => {
  if (value.source === 'event_qr' && (!value.sourceLinkSlug || !value.sourceToken)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['sourceToken'], message: 'The event QR source marker is incomplete.' });
  }
});

export type PickupCheckoutInput = z.infer<typeof pickupCheckoutSchema>;

export const pickupConfigSchema = z.object({
  isOrderingOpen: z.boolean(),
  eventName: z.string().trim().max(120),
  streetAddress: z.string().trim().max(300),
  asapWaitMinutes: z.number().int().min(1).max(240),
  // Store this explicitly with the event, rather than trusting a browser total.
  taxRatePercent: z.number().min(0).max(25),
}).superRefine((value, ctx) => {
  if (value.isOrderingOpen && !value.eventName) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['eventName'], message: 'An event/location name is required when ordering is open.' });
  }
  if (value.isOrderingOpen && !value.streetAddress) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['streetAddress'], message: 'A pickup street address is required when ordering is open.' });
  }
});

export type PickupConfigInput = z.infer<typeof pickupConfigSchema>;