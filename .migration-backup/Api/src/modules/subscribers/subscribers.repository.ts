import prisma from '../../lib/prisma';
import {
  ListSubscribersInput, CreateSubscriberInput, UpdateSubscriberInput,
  AddSubscriptionInput, UpdateSubscriptionInput,
} from './subscribers.schema';

const subscriberInclude = {
  subscriptions: {
    where: { isDeleted: false },
    include: { location: { select: { id: true, name: true } } },
  },
  user: { select: { id: true, firstName: true, lastName: true, emailAddress: true } },
} as const;

// ─── Subscribers ──────────────────────────────────────────────────────────────

export async function findSubscribers(input: ListSubscribersInput) {
  const { page, limit, optInEmail, optInSms, confirmed, search, orderBy, order } = input;
  const skip = (page - 1) * limit;
  const where: Record<string, unknown> = { isDeleted: false };

  if (optInEmail !== undefined) where['optInEmail'] = optInEmail;
  if (optInSms !== undefined) where['optInSms'] = optInSms;
  if (confirmed === true) where['confirmedAt'] = { not: null };
  if (confirmed === false) where['confirmedAt'] = null;
  if (search) {
    where['OR'] = [
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.subscriber.findMany({ where, include: subscriberInclude, orderBy: { [orderBy]: order }, skip, take: limit }),
    prisma.subscriber.count({ where }),
  ]);
  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function findSubscriberById(id: string) {
  return prisma.subscriber.findFirst({ where: { id, isDeleted: false }, include: subscriberInclude });
}

export async function findSubscriberByEmail(email: string) {
  return prisma.subscriber.findFirst({ where: { email, isDeleted: false } });
}

export async function createSubscriber(input: CreateSubscriberInput) {
  return prisma.subscriber.create({ data: input, include: subscriberInclude });
}

export async function updateSubscriber(id: string, input: UpdateSubscriberInput) {
  return prisma.subscriber.update({ where: { id }, data: input, include: subscriberInclude });
}

export async function softDeleteSubscriber(id: string) {
  return prisma.subscriber.update({ where: { id }, data: { isDeleted: true } });
}

// ─── Subscriptions ────────────────────────────────────────────────────────────

export async function findSubscriptionById(id: string) {
  return prisma.subscriberSubscription.findFirst({ where: { id, isDeleted: false } });
}

export async function addSubscription(subscriberId: string, input: AddSubscriptionInput) {
  return prisma.subscriberSubscription.create({
    data: { subscriberId, ...input },
    include: { location: { select: { id: true, name: true } } },
  });
}

export async function updateSubscription(id: string, input: UpdateSubscriptionInput) {
  return prisma.subscriberSubscription.update({
    where: { id },
    data: input,
    include: { location: { select: { id: true, name: true } } },
  });
}

export async function softDeleteSubscription(id: string) {
  return prisma.subscriberSubscription.update({ where: { id }, data: { isDeleted: true } });
}

