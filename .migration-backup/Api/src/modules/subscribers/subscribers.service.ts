import { ApiError } from '../../utils/apiError';
import {
  ListSubscribersInput, CreateSubscriberInput, UpdateSubscriberInput,
  AddSubscriptionInput, UpdateSubscriptionInput,
} from './subscribers.schema';
import * as repo from './subscribers.repository';
import { logAudit, AuditAction } from '../../utils/auditLogger';
import { sendNewsletterConfirmation, sendAdminNewSubscriberNotification } from '../../lib/notificationEmails';

// ─── Subscribers ──────────────────────────────────────────────────────────────

export async function listSubscribers(input: ListSubscribersInput) {
  return repo.findSubscribers(input);
}

export async function getSubscriberById(id: string) {
  const sub = await repo.findSubscriberById(id);
  if (!sub) throw ApiError.notFound('Subscriber');
  return sub;
}

export async function createSubscriber(input: CreateSubscriberInput) {
  // Prevent duplicate email registrations
  if (input.email) {
    const existing = await repo.findSubscriberByEmail(input.email);
    if (existing) throw ApiError.conflict('A subscriber with this email already exists');
  }
  const subscriber = await repo.createSubscriber(input);

  // Triggers: audit log + emails (fire-and-forget)
  logAudit({ action: AuditAction.SUBSCRIBER_ADDED, entityType: 'Subscriber', entityId: subscriber.id });
  if (input.email) {
    sendNewsletterConfirmation(input.email).catch(() => {});
    sendAdminNewSubscriberNotification(input.email).catch(() => {});
  }

  return subscriber;
}

export async function updateSubscriber(id: string, input: UpdateSubscriberInput) {
  await getSubscriberById(id);
  // Prevent email collision on update
  if (input.email) {
    const existing = await repo.findSubscriberByEmail(input.email);
    if (existing && existing.id !== id) throw ApiError.conflict('A subscriber with this email already exists');
  }
  return repo.updateSubscriber(id, input);
}

export async function deleteSubscriber(id: string) {
  await getSubscriberById(id);
  return repo.softDeleteSubscriber(id);
}

// ─── Subscriptions ────────────────────────────────────────────────────────────

export async function addSubscription(subscriberId: string, input: AddSubscriptionInput) {
  await getSubscriberById(subscriberId);
  return repo.addSubscription(subscriberId, input);
}

export async function updateSubscription(subscriberId: string, subscriptionId: string, input: UpdateSubscriptionInput) {
  await getSubscriberById(subscriberId);
  const sub = await repo.findSubscriptionById(subscriptionId);
  if (!sub) throw ApiError.notFound('Subscription');
  if (sub.subscriberId !== subscriberId) throw ApiError.forbidden('Subscription does not belong to this subscriber');
  return repo.updateSubscription(subscriptionId, input);
}

export async function deleteSubscription(subscriberId: string, subscriptionId: string) {
  await getSubscriberById(subscriberId);
  const sub = await repo.findSubscriptionById(subscriptionId);
  if (!sub) throw ApiError.notFound('Subscription');
  if (sub.subscriberId !== subscriberId) throw ApiError.forbidden('Subscription does not belong to this subscriber');
  return repo.softDeleteSubscription(subscriptionId);
}

