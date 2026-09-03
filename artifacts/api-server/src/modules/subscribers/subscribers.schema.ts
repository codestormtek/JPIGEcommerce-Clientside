import { z } from 'zod';

// ─── List subscribers ──────────────────────────────────────────────────────────

export const listSubscribersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  optInEmail: z.coerce.boolean().optional(),
  optInSms: z.coerce.boolean().optional(),
  confirmed: z.coerce.boolean().optional(),
  search: z.string().optional(),
  orderBy: z.enum(['createdAt', 'email']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type ListSubscribersInput = z.infer<typeof listSubscribersSchema>;

// ─── Create subscriber ────────────────────────────────────────────────────────

export const createSubscriberSchema = z
  .object({
    email: z.string().email('Must be a valid email').optional(),
    phone: z.string().optional(),
    zip: z.string().optional(),
    optInEmail: z.boolean().default(false),
    optInSms: z.boolean().default(false),
  })
  .refine((d) => d.email || d.phone, {
    message: 'At least one of email or phone is required',
    path: ['email'],
  });

export type CreateSubscriberInput = z.infer<typeof createSubscriberSchema>;

// ─── Update subscriber ────────────────────────────────────────────────────────

export const updateSubscriberSchema = z.object({
  email: z.string().email('Must be a valid email').optional(),
  phone: z.string().optional(),
  zip: z.string().optional(),
  optInEmail: z.boolean().optional(),
  optInSms: z.boolean().optional(),
  confirmedAt: z.coerce.date().optional(),
});

export type UpdateSubscriberInput = z.infer<typeof updateSubscriberSchema>;

// ─── Subscription topics ──────────────────────────────────────────────────────

export const subscriptionTypeEnum = z.enum(['sales', 'truck_schedule', 'menu_updates', 'news']);

export const addSubscriptionSchema = z.object({
  subscriptionType: subscriptionTypeEnum,
  locationId: z.string().min(1).optional(),
  radiusMiles: z.number().int().positive().optional(),
  isEnabled: z.boolean().default(true),
});

export type AddSubscriptionInput = z.infer<typeof addSubscriptionSchema>;

export const updateSubscriptionSchema = addSubscriptionSchema.partial();
export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;

