import { z } from 'zod';
import { normalizePhone } from '../../lib/phone';

// ─── Kiosk order (device-authenticated, in-store pickup) ─────────────────────

export const kioskOrderSchema = z.object({
  clientRequestId: z.string().uuid(),
  lines: z
    .array(
      z.object({
        productItemId: z.string().min(1),
        qty: z.number().int().positive().max(50),
        /** Quantity explicitly added from an upsell campaign. */
        upsellQty: z.number().int().positive().max(50).optional(),
        /** Active upsell campaign whose targeting and discount are verified server-side. */
        campaignId: z.string().uuid().optional(),
        /** For combo meals: chosen side product IDs (must match the combo's included side count) */
        sideProductIds: z.array(z.string().min(1)).max(10).optional(),
      }).superRefine((line, ctx) => {
        if (line.upsellQty && !line.campaignId) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['campaignId'],
            message: 'campaignId is required when upsellQty is supplied',
          });
        }
        if (line.campaignId && !line.upsellQty) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['upsellQty'],
            message: 'upsellQty is required when campaignId is supplied',
          });
        }
      }),
    )
    .min(1, 'At least one item is required')
    .max(50),
  customerName: z.string().min(1, 'Customer name is required').max(100),
  customerPhone: z
    .string()
    .max(30)
    .refine((phone) => !phone.trim() || normalizePhone(phone) !== null, 'Enter a valid US phone number')
    .optional(),
  specialInstructions: z.string().max(500).optional(),
  /** 'terminal' pushes the checkout to the paired Square Terminal; 'card' uses an on-screen nonce */
  paymentMethod: z.enum(['terminal', 'card']),
  /** Square nonce (sourceId) from Web Payments SDK — required when paymentMethod = 'card' */
  squareNonce: z.string().optional(),
});

export type KioskOrderInput = z.infer<typeof kioskOrderSchema>;

// ─── Privacy-safe operational analytics ─────────────────────────────────────

const analyticsBase = {
  eventId: z.string().uuid(),
  occurredAt: z.string().datetime({ offset: true }).transform((value) => new Date(value)),
  sessionId: z.string().uuid(),
  durationMs: z.number().int().min(0).max(86_400_000).optional(),
};
const paymentMetadata = z.object({
  paymentMethod: z.enum(['terminal', 'card']),
}).strict();

export const kioskAnalyticsEventSchema = z.discriminatedUnion('eventType', [
  z.object({
    ...analyticsBase,
    eventType: z.literal('session_started'),
    metadata: z.object({
      entryPoint: z.enum(['idle', 'post_checkout', 'timeout', 'manual']),
    }).strict().default({ entryPoint: 'idle' }),
  }).strict(),
  z.object({
    ...analyticsBase,
    eventType: z.literal('cart_started'),
    metadata: z.object({
      source: z.enum(['menu', 'campaign']),
    }).strict().default({ source: 'menu' }),
  }).strict(),
  z.object({
    ...analyticsBase,
    eventType: z.literal('cart_abandoned'),
    metadata: z.object({
      reason: z.enum(['idle_timeout', 'customer_cancelled', 'navigation_reset', 'unknown']),
      cartSizeBucket: z.enum(['1', '2-3', '4-6', '7+']),
    }).strict(),
  }).strict(),
  z.object({
    ...analyticsBase,
    eventType: z.literal('timeout_reset'),
    metadata: z.object({
      stage: z.enum(['menu', 'cart', 'side_selection', 'checkout', 'payment']),
    }).strict(),
  }).strict(),
  z.object({
    ...analyticsBase,
    eventType: z.literal('side_selected'),
    productId: z.string().uuid().optional(),
    sideProductId: z.string().uuid(),
    metadata: z.object({
      selectionPosition: z.enum(['first', 'additional']),
    }).strict().default({ selectionPosition: 'first' }),
  }).strict(),
  z.object({
    ...analyticsBase,
    eventType: z.literal('side_edit'),
    productId: z.string().uuid().optional(),
    sideProductId: z.string().uuid(),
    metadata: z.object({
      action: z.enum(['add', 'remove', 'replace']),
    }).strict(),
  }).strict(),
  z.object({
    ...analyticsBase,
    eventType: z.literal('checkout_started'),
    metadata: paymentMetadata,
  }).strict(),
  z.object({
    ...analyticsBase,
    eventType: z.literal('checkout_completed'),
    metadata: paymentMetadata,
  }).strict(),
  z.object({
    ...analyticsBase,
    eventType: z.literal('checkout_failed'),
    metadata: z.object({
      paymentMethod: z.enum(['terminal', 'card']),
      failureCategory: z.enum([
        'declined', 'cancelled', 'reader_unavailable', 'network',
        'timeout', 'validation', 'unknown',
      ]),
    }).strict(),
  }).strict(),
]).superRefine((event, ctx) => {
  if (event.occurredAt.getTime() > Date.now() + 5 * 60 * 1000) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['occurredAt'],
      message: 'occurredAt cannot be more than five minutes in the future',
    });
  }
});

export type KioskAnalyticsEventInput = z.infer<typeof kioskAnalyticsEventSchema>;

// ─── Admin: kiosk device management ──────────────────────────────────────────

export const createKioskDeviceSchema = z.object({
  name: z.string().min(1, 'Device name is required').max(100),
});

export type CreateKioskDeviceInput = z.infer<typeof createKioskDeviceSchema>;

export const updateKioskDeviceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
  /** Square Terminal device_id to link (or null to unlink) */
  squareTerminalDeviceId: z.string().max(100).nullable().optional(),
});

export type UpdateKioskDeviceInput = z.infer<typeof updateKioskDeviceSchema>;

// ─── Kiosk marketing campaigns ───────────────────────────────────────────────

const campaignFields = z.object({
  name: z.string().trim().min(1, 'Name is required').max(150),
  description: z.string().trim().max(1000).nullable().optional(),
  title: z.string().trim().max(200).nullable().optional(),
  body: z.string().trim().max(2000).nullable().optional(),
  campaignType: z.enum(['upsell', 'post_sale_ad']),
  isActive: z.boolean().default(false),
  startsAt: z.coerce.date().nullable().optional(),
  endsAt: z.coerce.date().nullable().optional(),
  priority: z.number().int().min(-100000).max(100000).default(0),
  amountOff: z.number().positive().max(100000)
    .refine((value) => Number.isInteger(value * 100), 'amountOff may have at most two decimal places')
    .nullable().optional(),
  mediaAssetId: z.string().uuid().nullable().optional(),
  durationSeconds: z.number().int().min(1).max(3600).default(10),
  allKiosks: z.boolean().default(true),
  productIds: z.array(z.string().uuid()).max(500).default([]),
});

function validateCampaignShape(
  value: {
    campaignType?: 'upsell' | 'post_sale_ad';
    isActive?: boolean;
    startsAt?: Date | null;
    endsAt?: Date | null;
    amountOff?: number | null;
    mediaAssetId?: string | null;
    productIds?: string[];
  },
  ctx: z.RefinementCtx,
) {
  if (value.startsAt && value.endsAt && value.startsAt >= value.endsAt) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endsAt'], message: 'endsAt must be after startsAt' });
  }
  if (value.campaignType === 'upsell') {
    if (!value.amountOff) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['amountOff'], message: 'Upsell campaigns require amountOff' });
    }
    if (value.isActive && !value.productIds?.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['productIds'], message: 'Active upsell campaigns require at least one product' });
    }
  }
  if (value.campaignType === 'post_sale_ad' && !value.mediaAssetId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['mediaAssetId'], message: 'Post-sale ads require an image media asset' });
  }
}

export const createKioskCampaignSchema = campaignFields.superRefine(validateCampaignShape);
export type CreateKioskCampaignInput = z.infer<typeof createKioskCampaignSchema>;

export const updateKioskCampaignSchema = campaignFields.partial();
export type UpdateKioskCampaignInput = z.infer<typeof updateKioskCampaignSchema>;
