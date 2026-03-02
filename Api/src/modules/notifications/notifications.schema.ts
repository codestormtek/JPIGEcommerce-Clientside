import { z } from 'zod';

// ─── Channels / event types ────────────────────────────────────────────────────

export const channelEnum = z.enum(['inapp', 'email', 'sms']);
export const outboxChannelEnum = z.enum(['email', 'sms']);
export const outboxStatusEnum = z.enum(['queued', 'sending', 'sent', 'failed']);

// ─── List outbox messages (admin) ─────────────────────────────────────────────

export const listOutboxSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  channel: outboxChannelEnum.optional(),
  status: outboxStatusEnum.optional(),
  toAddress: z.string().optional(),
  orderBy: z.enum(['createdAt', 'sentAt', 'status']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type ListOutboxInput = z.infer<typeof listOutboxSchema>;

// ─── NotificationSubscription management ──────────────────────────────────────

export const listSubscriptionsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  channel: channelEnum.optional(),
  isEnabled: z.coerce.boolean().optional(),
});

export type ListSubscriptionsInput = z.infer<typeof listSubscriptionsSchema>;

export const createSubscriptionSchema = z.object({
  channel: channelEnum,
  eventType: z.string().min(1, 'eventType is required'),
  isEnabled: z.boolean().default(true),
});

export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;

export const updateSubscriptionSchema = z.object({
  isEnabled: z.boolean(),
});

export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;

// ─── UserNotification inbox ────────────────────────────────────────────────────

export const listUserNotificationsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  isRead: z.coerce.boolean().optional(),
  orderBy: z.enum(['createdAt', 'readAt']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type ListUserNotificationsInput = z.infer<typeof listUserNotificationsSchema>;

