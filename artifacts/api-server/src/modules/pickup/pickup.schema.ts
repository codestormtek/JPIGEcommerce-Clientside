import { z } from 'zod';
import { normalizePhone } from '../../lib/phone';
import { isValidTimeZone, localDateTimeToUtc } from './pickupSchedule';

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
  // Transactional pickup updates only; this is order-scoped guest consent,
  // not the signed-in user's global marketing/SMS preference.
  smsOptIn: z.boolean().optional().default(false),
  specialInstructions: z.string().trim().max(500).optional(),
  pickupAt: z.string().datetime({ offset: true }).optional(),
  squareNonce: z.string().min(1, 'A card payment is required'),
  source: z.enum(['remote', 'event_qr']).optional(),
  sourceLinkSlug: z.string().trim().toLowerCase().max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  sourceToken: z.string().regex(/^[A-Za-z0-9_-]{40,}$/).optional(),
}).superRefine((value, ctx) => {
  if (value.source === 'event_qr' && (!value.sourceLinkSlug || !value.sourceToken)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['sourceToken'], message: 'The event QR source marker is incomplete.' });
  }
});

export type PickupCheckoutInput = Omit<z.infer<typeof pickupCheckoutSchema>, 'smsOptIn'> & { smsOptIn?: boolean };

export const pickupConfigSchema = z.object({
  isOrderingOpen: z.boolean(),
  eventName: z.string().trim().max(120),
  streetAddress: z.string().trim().max(300),
  pickupInstructions: z.string().trim().max(1000).optional(),
  asapWaitMinutes: z.number().int().min(1).max(240),
  schedulingEnabled: z.boolean().optional().default(false),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().default(''),
  opensAt: z.string().regex(/^\d{2}:\d{2}$/).optional().default(''),
  shutsDownAt: z.string().regex(/^\d{2}:\d{2}$/).optional().default(''),
  timezone: z.string().trim().max(100).optional().default('America/New_York'),
  slotIntervalMinutes: z.number().int().min(5).max(60).optional().default(15),
  minimumPrepMinutes: z.number().int().min(1).max(240).optional().default(15),
  reminderLeadMinutes: z.number().int().min(0).max(240).optional().default(15),
  // Store this explicitly with the event, rather than trusting a browser total.
  taxRatePercent: z.number().min(0).max(25),
}).superRefine((value, ctx) => {
  if (value.isOrderingOpen && !value.eventName) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['eventName'], message: 'An event/location name is required when ordering is open.' });
  }
  if (value.isOrderingOpen && !value.streetAddress) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['streetAddress'], message: 'A pickup street address is required when ordering is open.' });
  }
  if (value.schedulingEnabled) {
    for (const [key, message] of [
      ['eventDate', 'An event date is required for scheduled pickup.'],
      ['opensAt', 'An opening time is required for scheduled pickup.'],
      ['shutsDownAt', 'A shutdown time is required for scheduled pickup.'],
      ['timezone', 'A timezone is required for scheduled pickup.'],
    ] as const) {
      if (!value[key]) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key], message });
    }
    if (value.timezone && !isValidTimeZone(value.timezone)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['timezone'], message: 'Enter a valid IANA timezone, such as America/New_York.' });
    }
    const opens = localDateTimeToUtc(value.eventDate, value.opensAt, value.timezone);
    const shuts = localDateTimeToUtc(value.eventDate, value.shutsDownAt, value.timezone);
    if (value.eventDate && value.opensAt && value.timezone && !opens) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['opensAt'], message: 'Opening date/time does not exist in this timezone.' });
    }
    if (value.eventDate && value.shutsDownAt && value.timezone && !shuts) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['shutsDownAt'], message: 'Shutdown date/time does not exist in this timezone.' });
    }
    if (opens && shuts && shuts.getTime() - opens.getTime() <= 30 * 60_000) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['shutsDownAt'], message: 'Shutdown must be more than 30 minutes after opening.' });
    }
  }
});

export type PickupConfigInput = z.infer<typeof pickupConfigSchema>;