import { ApiError } from '../../utils/apiError';
import {
  ListOutboxInput,
  ListSubscriptionsInput,
  CreateSubscriptionInput,
  UpdateSubscriptionInput,
  ListUserNotificationsInput,
  SendEmailInput,
  ListInboxInput,
  UpdateInboxMessageInput,
} from './notifications.schema';
import * as repo from './notifications.repository';
import { sendEmail } from '../../lib/mailer';
import prisma from '../../lib/prisma';

// ─── MessageOutbox (admin) ────────────────────────────────────────────────────

export async function listOutbox(input: ListOutboxInput) {
  return repo.findOutbox(input);
}

export async function getOutboxById(id: string) {
  const msg = await repo.findOutboxById(id);
  if (!msg) throw ApiError.notFound('Message');
  return msg;
}

export async function deleteOutboxMessage(id: string) {
  await getOutboxById(id);
  return repo.deleteOutboxMessage(id);
}

// ─── Manual send email (admin) ───────────────────────────────────────────────

export async function sendManualEmail(input: SendEmailInput) {
  const providerId = await sendEmail({
    to: input.to,
    subject: input.subject,
    html: input.bodyHtml,
    text: input.bodyText,
    headers: input.headers,
  });

  return prisma.messageOutbox.create({
    data: {
      channel: 'email',
      toAddress: input.to,
      templateKey: 'manual',
      subject: input.subject,
      bodyHtml: input.bodyHtml,
      bodyText: input.bodyText ?? null,
      payloadJson: JSON.stringify({ to: input.to, subject: input.subject }),
      status: 'sent',
      provider: 'resend',
      providerMessageId: providerId ?? null,
      sentAt: new Date(),
    },
  });
}

// ─── MessageInbox (inbound emails) ───────────────────────────────────────────

export async function listInbox(input: ListInboxInput) {
  return repo.findInbox(input);
}

export async function getInboxById(id: string) {
  const msg = await repo.findInboxById(id);
  if (!msg) throw ApiError.notFound('Message');
  return msg;
}

export async function updateInboxMessage(id: string, input: UpdateInboxMessageInput) {
  await getInboxById(id);
  return repo.updateInboxMessage(id, input);
}

export async function deleteInboxMessage(id: string) {
  await getInboxById(id);
  return repo.deleteInboxMessage(id);
}

// ─── NotificationSubscription ─────────────────────────────────────────────────

export async function listSubscriptions(userId: string, input: ListSubscriptionsInput) {
  return repo.findSubscriptions(userId, input);
}

export async function createSubscription(userId: string, input: CreateSubscriptionInput) {
  return repo.createSubscription(userId, input);
}

export async function updateSubscription(userId: string, subscriptionId: string, input: UpdateSubscriptionInput) {
  const sub = await repo.findSubscriptionById(subscriptionId);
  if (!sub) throw ApiError.notFound('Subscription');
  if (sub.userId !== userId) throw ApiError.forbidden('Subscription does not belong to this user');
  return repo.updateSubscription(subscriptionId, input);
}

export async function deleteSubscription(userId: string, subscriptionId: string) {
  const sub = await repo.findSubscriptionById(subscriptionId);
  if (!sub) throw ApiError.notFound('Subscription');
  if (sub.userId !== userId) throw ApiError.forbidden('Subscription does not belong to this user');
  return repo.deleteSubscription(subscriptionId);
}

// ─── UserNotification inbox ────────────────────────────────────────────────────

export async function listUserNotifications(userId: string, input: ListUserNotificationsInput) {
  return repo.findUserNotifications(userId, input);
}

export async function markNotificationRead(userId: string, notificationId: string) {
  const notification = await repo.findUserNotificationById(notificationId);
  if (!notification) throw ApiError.notFound('Notification');
  if (notification.userId !== userId) throw ApiError.forbidden('Notification does not belong to this user');
  return repo.markNotificationRead(notificationId);
}

export async function deleteUserNotification(userId: string, notificationId: string) {
  const notification = await repo.findUserNotificationById(notificationId);
  if (!notification) throw ApiError.notFound('Notification');
  if (notification.userId !== userId) throw ApiError.forbidden('Notification does not belong to this user');
  return repo.deleteUserNotification(notificationId);
}

