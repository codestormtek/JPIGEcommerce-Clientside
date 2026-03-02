import prisma from '../../lib/prisma';
import {
  ListOutboxInput,
  ListSubscriptionsInput,
  CreateSubscriptionInput,
  UpdateSubscriptionInput,
  ListUserNotificationsInput,
} from './notifications.schema';

// ─── MessageOutbox ────────────────────────────────────────────────────────────

export async function findOutbox(input: ListOutboxInput) {
  const { page, limit, channel, status, toAddress, orderBy, order } = input;
  const skip = (page - 1) * limit;
  const where: Record<string, unknown> = {};

  if (channel) where['channel'] = channel;
  if (status) where['status'] = status;
  if (toAddress) where['toAddress'] = { contains: toAddress, mode: 'insensitive' };

  const [data, total] = await Promise.all([
    prisma.messageOutbox.findMany({
      where,
      orderBy: { [orderBy]: order },
      skip,
      take: limit,
    }),
    prisma.messageOutbox.count({ where }),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function findOutboxById(id: string) {
  return prisma.messageOutbox.findUnique({
    where: { id },
    include: {
      deliveryLogs: { orderBy: { createdAt: 'asc' } },
    },
  });
}

export async function deleteOutboxMessage(id: string) {
  return prisma.$transaction(async (tx) => {
    await tx.messageDeliveryLog.deleteMany({ where: { outboxId: id } });
    return tx.messageOutbox.delete({ where: { id } });
  });
}

// ─── NotificationSubscription ─────────────────────────────────────────────────

export async function findSubscriptions(userId: string, input: ListSubscriptionsInput) {
  const { page, limit, channel, isEnabled } = input;
  const skip = (page - 1) * limit;
  const where: Record<string, unknown> = { userId };

  if (channel) where['channel'] = channel;
  if (isEnabled !== undefined) where['isEnabled'] = isEnabled;

  const [data, total] = await Promise.all([
    prisma.notificationSubscription.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      skip,
      take: limit,
    }),
    prisma.notificationSubscription.count({ where }),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function findSubscriptionById(id: string) {
  return prisma.notificationSubscription.findUnique({ where: { id } });
}

export async function createSubscription(userId: string, input: CreateSubscriptionInput) {
  return prisma.notificationSubscription.create({
    data: { userId, ...input },
  });
}

export async function updateSubscription(id: string, input: UpdateSubscriptionInput) {
  return prisma.notificationSubscription.update({ where: { id }, data: input });
}

export async function deleteSubscription(id: string) {
  return prisma.notificationSubscription.delete({ where: { id } });
}

// ─── UserNotification inbox ────────────────────────────────────────────────────

export async function findUserNotifications(userId: string, input: ListUserNotificationsInput) {
  const { page, limit, isRead, orderBy, order } = input;
  const skip = (page - 1) * limit;
  const where: Record<string, unknown> = { userId };
  if (isRead !== undefined) where['isRead'] = isRead;

  const [data, total] = await Promise.all([
    prisma.userNotification.findMany({
      where,
      orderBy: { [orderBy]: order },
      skip,
      take: limit,
    }),
    prisma.userNotification.count({ where }),
  ]);
  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function findUserNotificationById(id: string) {
  return prisma.userNotification.findUnique({ where: { id } });
}

export async function markNotificationRead(id: string) {
  return prisma.userNotification.update({
    where: { id },
    data: { isRead: true, readAt: new Date() },
  });
}

export async function deleteUserNotification(id: string) {
  return prisma.userNotification.delete({ where: { id } });
}

