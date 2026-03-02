import { ApiError } from '../../utils/apiError';
import {
  ListOutboxInput,
  ListSubscriptionsInput,
  CreateSubscriptionInput,
  UpdateSubscriptionInput,
  ListUserNotificationsInput,
} from './notifications.schema';
import * as repo from './notifications.repository';

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

