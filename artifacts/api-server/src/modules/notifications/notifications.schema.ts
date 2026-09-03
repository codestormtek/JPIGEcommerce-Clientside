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

// ─── Manual send email (admin) ───────────────────────────────────────────────

export const sendEmailSchema = z.object({
  to: z.string().email('Invalid email address'),
  subject: z.string().min(1, 'Subject is required'),
  bodyHtml: z.string().min(1, 'Body is required'),
  bodyText: z.string().optional(),
  headers: z.record(z.string()).optional(),
});

export type SendEmailInput = z.infer<typeof sendEmailSchema>;

// ─── MessageInbox (inbound emails) ───────────────────────────────────────────

export const listInboxSchema = z.object({
  page:    z.coerce.number().int().positive().default(1),
  limit:   z.coerce.number().int().positive().max(100).default(20),
  isRead:  z.coerce.boolean().optional(),
  isTrash: z.coerce.boolean().optional(),
  orderBy: z.enum(['createdAt']).default('createdAt'),
  order:   z.enum(['asc', 'desc']).default('desc'),
});

export type ListInboxInput = z.infer<typeof listInboxSchema>;

export const updateInboxMessageSchema = z.object({
  isRead:      z.boolean().optional(),
  isTrash:     z.boolean().optional(),
  isArchived:  z.boolean().optional(),
  isFavourite: z.boolean().optional(),
});

export type UpdateInboxMessageInput = z.infer<typeof updateInboxMessageSchema>;

// ─── UserNotification inbox ────────────────────────────────────────────────────

export const listUserNotificationsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  isRead: z.coerce.boolean().optional(),
  orderBy: z.enum(['createdAt', 'readAt']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type ListUserNotificationsInput = z.infer<typeof listUserNotificationsSchema>;

