import prisma from '../../lib/prisma';
import {
  CreateLiveSessionInput,
  UpdateLiveSessionInput,
  ListLiveSessionsInput,
  AlertHistoryInput,
} from './live-sessions.schema';

const sessionInclude = {
  createdByUser: { select: { id: true, firstName: true, lastName: true, emailAddress: true } },
  smsAlertCampaigns: {
    orderBy: { createdAt: 'desc' as const },
    take: 5,
    select: {
      id: true,
      messageBody: true,
      totalRecipients: true,
      totalSent: true,
      totalFailed: true,
      sentAt: true,
    },
  },
} as const;

export async function findSessions(input: ListLiveSessionsInput) {
  const { page, limit, status, search, orderBy, order } = input;
  const skip = (page - 1) * limit;
  const where: Record<string, unknown> = {};

  if (status) where['status'] = status;
  if (search) {
    where['OR'] = [
      { title: { contains: search, mode: 'insensitive' } },
      { locationName: { contains: search, mode: 'insensitive' } },
      { address: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.liveSession.findMany({
      where,
      include: sessionInclude,
      orderBy: { [orderBy]: order },
      skip,
      take: limit,
    }),
    prisma.liveSession.count({ where }),
  ]);
  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function findSessionById(id: string) {
  return prisma.liveSession.findUnique({
    where: { id },
    include: {
      ...sessionInclude,
      smsAlertCampaigns: {
        orderBy: { createdAt: 'desc' as const },
        include: {
          messages: {
            select: { id: true, phoneNumber: true, sendStatus: true, sentAt: true, errorMessage: true },
          },
        },
      },
    },
  });
}

export async function findCurrentLiveSession() {
  return prisma.liveSession.findFirst({
    where: { status: 'LIVE', isPublished: true },
    include: {
      createdByUser: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function findAnyLiveSession() {
  return prisma.liveSession.findFirst({
    where: { status: 'LIVE' },
  });
}

export async function createSession(input: CreateLiveSessionInput, userId?: string) {
  return prisma.liveSession.create({
    data: {
      title: input.title,
      locationName: input.locationName ?? null,
      address: input.address ?? null,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      message: input.message ?? null,
      startTime: input.startTime ? new Date(input.startTime) : null,
      endTime: input.endTime ? new Date(input.endTime) : null,
      status: input.status ?? 'DRAFT',
      createdByUserId: userId ?? null,
    },
    include: sessionInclude,
  });
}

export async function updateSession(id: string, input: UpdateLiveSessionInput) {
  const data: Record<string, unknown> = {};
  if (input.title !== undefined) data['title'] = input.title;
  if (input.locationName !== undefined) data['locationName'] = input.locationName;
  if (input.address !== undefined) data['address'] = input.address;
  if (input.lat !== undefined) data['lat'] = input.lat;
  if (input.lng !== undefined) data['lng'] = input.lng;
  if (input.message !== undefined) data['message'] = input.message;
  if (input.startTime !== undefined) data['startTime'] = input.startTime ? new Date(input.startTime) : null;
  if (input.endTime !== undefined) data['endTime'] = input.endTime ? new Date(input.endTime) : null;
  if (input.status !== undefined) data['status'] = input.status;

  return prisma.liveSession.update({
    where: { id },
    data,
    include: sessionInclude,
  });
}

export async function setSessionLive(id: string, mapUrl: string | null) {
  return prisma.liveSession.update({
    where: { id },
    data: {
      status: 'LIVE',
      isPublished: true,
      startTime: new Date(),
      mapUrl: mapUrl,
    },
    include: sessionInclude,
  });
}

export async function setSessionClosed(id: string) {
  return prisma.liveSession.update({
    where: { id },
    data: {
      status: 'CLOSED',
      isPublished: false,
      endTime: new Date(),
    },
    include: sessionInclude,
  });
}

export async function deleteSession(id: string) {
  await prisma.smsAlertMessage.deleteMany({
    where: { campaign: { liveSessionId: id } },
  });
  await prisma.smsAlertCampaign.deleteMany({
    where: { liveSessionId: id },
  });
  return prisma.liveSession.delete({ where: { id } });
}

export async function findMostRecentSession() {
  return prisma.liveSession.findFirst({
    orderBy: { createdAt: 'desc' },
    include: sessionInclude,
  });
}

export async function findSmsOptedInSubscribers() {
  return prisma.subscriber.findMany({
    where: {
      isDeleted: false,
      optInSms: true,
      phone: { not: null },
    },
    select: {
      id: true,
      phone: true,
      email: true,
    },
  });
}

export async function createCampaign(data: {
  liveSessionId: string;
  messageBody: string;
  audienceType: string;
  totalRecipients: number;
  totalSent: number;
  totalFailed: number;
  sentAt: Date;
  createdByUserId?: string;
}) {
  return prisma.smsAlertCampaign.create({
    data,
    include: {
      messages: true,
    },
  });
}

export async function createAlertMessage(data: {
  campaignId: string;
  subscriberId?: string | null;
  phoneNumber: string;
  messageBody: string;
  providerMessageId?: string | null;
  sendStatus: string;
  errorMessage?: string | null;
  sentAt?: Date | null;
}) {
  return prisma.smsAlertMessage.create({ data });
}

export async function findAlertHistory(input: AlertHistoryInput) {
  const { page, limit, sessionId, dateFrom, dateTo } = input;
  const skip = (page - 1) * limit;
  const where: Record<string, unknown> = {};

  if (sessionId) where['liveSessionId'] = sessionId;
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
    prisma.smsAlertCampaign.findMany({
      where,
      include: {
        liveSession: { select: { id: true, title: true, locationName: true, address: true } },
        messages: {
          select: { id: true, phoneNumber: true, sendStatus: true, sentAt: true, errorMessage: true },
        },
        createdByUser: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.smsAlertCampaign.count({ where }),
  ]);
  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function countSmsOptedInSubscribers() {
  return prisma.subscriber.count({
    where: {
      isDeleted: false,
      optInSms: true,
      phone: { not: null },
    },
  });
}

export async function findSubscriberByPhone(phone: string) {
  return prisma.subscriber.findFirst({
    where: { phone, isDeleted: false },
  });
}

export async function createSubscriber(data: {
  phone: string;
  email?: string | null;
  optInSms: boolean;
  confirmedAt?: Date | null;
}) {
  return prisma.subscriber.create({ data });
}

export async function unsubscribeByPhone(phone: string) {
  const subscriber = await prisma.subscriber.findFirst({
    where: { phone, isDeleted: false },
  });
  if (!subscriber) return null;
  return prisma.subscriber.update({
    where: { id: subscriber.id },
    data: { optInSms: false },
  });
}

export async function resubscribeByPhone(phone: string) {
  const subscriber = await prisma.subscriber.findFirst({
    where: { phone, isDeleted: false },
  });
  if (!subscriber) return null;
  return prisma.subscriber.update({
    where: { id: subscriber.id },
    data: { optInSms: true, confirmedAt: new Date() },
  });
}
