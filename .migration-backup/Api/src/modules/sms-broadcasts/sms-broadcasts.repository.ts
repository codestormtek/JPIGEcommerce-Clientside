import prisma from '../../lib/prisma';
import { ListBroadcastsInput, PreviewAudienceInput } from './sms-broadcasts.schema';

interface AudienceSubscriber {
  id: string;
  phone: string | null;
  email: string | null;
}

/**
 * Resolves the deduplicated list of SMS-opted-in subscribers for an audience.
 * - "all": every subscriber with optInSms + a phone
 * - "topic": those additionally subscribed (enabled) to the given subscriptionType
 */
export async function findAudienceSubscribers(input: PreviewAudienceInput): Promise<AudienceSubscriber[]> {
  const where: Record<string, unknown> = {
    isDeleted: false,
    optInSms: true,
    phone: { not: null },
  };

  if (input.audienceType === 'topic' && input.audienceTopic) {
    where['subscriptions'] = {
      some: {
        isDeleted: false,
        isEnabled: true,
        subscriptionType: input.audienceTopic,
      },
    };
  }

  return prisma.subscriber.findMany({
    where,
    select: { id: true, phone: true, email: true },
  });
}

export async function createBroadcast(data: {
  title?: string | null;
  messageBody: string;
  audienceType: string;
  audienceTopic?: string | null;
  status: string;
  totalRecipients: number;
  totalSent: number;
  totalFailed: number;
  sentAt: Date;
  createdByUserId?: string | null;
}) {
  return prisma.smsBroadcast.create({ data });
}

export async function updateBroadcast(
  id: string,
  data: { status?: string; totalSent?: number; totalFailed?: number },
) {
  return prisma.smsBroadcast.update({ where: { id }, data });
}

export async function createBroadcastRecipient(data: {
  broadcastId: string;
  subscriberId?: string | null;
  phoneNumber: string;
  providerMessageId?: string | null;
  sendStatus: string;
  errorMessage?: string | null;
  sentAt?: Date | null;
}) {
  return prisma.smsBroadcastRecipient.create({ data });
}

export async function findBroadcasts(input: ListBroadcastsInput) {
  const { page, limit, dateFrom, dateTo } = input;
  const skip = (page - 1) * limit;
  const where: Record<string, unknown> = {};

  if (dateFrom || dateTo) {
    const createdAtFilter: Record<string, unknown> = {};
    if (dateFrom) createdAtFilter['gte'] = new Date(dateFrom);
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      createdAtFilter['lte'] = end;
    }
    where['createdAt'] = createdAtFilter;
  }

  const [data, total] = await Promise.all([
    prisma.smsBroadcast.findMany({
      where,
      include: {
        createdByUser: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.smsBroadcast.count({ where }),
  ]);
  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function findBroadcastById(id: string) {
  return prisma.smsBroadcast.findUnique({
    where: { id },
    include: {
      createdByUser: { select: { id: true, firstName: true, lastName: true } },
      recipients: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          phoneNumber: true,
          sendStatus: true,
          errorMessage: true,
          sentAt: true,
        },
      },
    },
  });
}
