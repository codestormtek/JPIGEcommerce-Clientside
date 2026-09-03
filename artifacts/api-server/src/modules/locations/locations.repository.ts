import prisma from '../../lib/prisma';
import {
  ListLocationsInput, CreateLocationInput, UpdateLocationInput,
  ListEventsInput, CreateEventInput, UpdateEventInput,
} from './locations.schema';

type TxClient = Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

const eventInclude = {
  location: true,
  menu: { select: { id: true, name: true } },
  media: { include: { mediaAsset: true }, orderBy: { sortOrder: 'asc' as const } },
} as const;

// ─── Locations ────────────────────────────────────────────────────────────────

export async function findLocations(input: ListLocationsInput) {
  const { page, limit, isActive, orderBy, order } = input;
  const skip = (page - 1) * limit;
  const where: Record<string, unknown> = {};
  if (isActive !== undefined) where['isActive'] = isActive;

  const [data, total] = await Promise.all([
    prisma.location.findMany({
      where,
      include: { address: true },
      orderBy: { [orderBy]: order },
      skip,
      take: limit,
    }),
    prisma.location.count({ where }),
  ]);
  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function findLocationById(id: string) {
  return prisma.location.findUnique({ where: { id }, include: { address: true } });
}

export async function createLocation(input: CreateLocationInput) {
  return prisma.location.create({ data: input, include: { address: true } });
}

export async function updateLocation(id: string, input: UpdateLocationInput) {
  return prisma.location.update({ where: { id }, data: input, include: { address: true } });
}

export async function deleteLocation(id: string) {
  return prisma.location.delete({ where: { id } });
}

// ─── ScheduleEvents ───────────────────────────────────────────────────────────

export async function findEvents(input: ListEventsInput) {
  const { page, limit, locationId, eventType, status, isPublic, startFrom, startTo, orderBy, order } = input;
  const skip = (page - 1) * limit;
  const where: Record<string, unknown> = { isDeleted: false };
  if (locationId) where['locationId'] = locationId;
  if (eventType) where['eventType'] = eventType;
  if (status) where['status'] = status;
  if (isPublic !== undefined) where['isPublic'] = isPublic;
  if (startFrom || startTo) {
    where['startTime'] = {
      ...(startFrom ? { gte: startFrom } : {}),
      ...(startTo ? { lte: startTo } : {}),
    };
  }

  const [data, total] = await Promise.all([
    prisma.scheduleEvent.findMany({ where, include: eventInclude, orderBy: { [orderBy]: order }, skip, take: limit }),
    prisma.scheduleEvent.count({ where }),
  ]);
  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function findEventById(id: string) {
  return prisma.scheduleEvent.findFirst({ where: { id, isDeleted: false }, include: eventInclude });
}

async function syncEventMedia(tx: TxClient, eventId: string, mediaAssetIds: string[]) {
  await tx.scheduleEventMedia.deleteMany({ where: { eventId } });
  if (mediaAssetIds.length) {
    await tx.scheduleEventMedia.createMany({
      data: mediaAssetIds.map((mediaAssetId, sortOrder) => ({ eventId, mediaAssetId, sortOrder })),
    });
  }
}

export async function createEvent(userId: string, input: CreateEventInput) {
  const { mediaAssetIds, ...data } = input;
  return prisma.$transaction(async (tx: TxClient) => {
    const event = await tx.scheduleEvent.create({ data: { ...data, createdBy: userId }, include: eventInclude });
    if (mediaAssetIds?.length) await syncEventMedia(tx, event.id, mediaAssetIds);
    return tx.scheduleEvent.findUnique({ where: { id: event.id }, include: eventInclude });
  });
}

export async function updateEvent(id: string, userId: string, input: UpdateEventInput) {
  const { mediaAssetIds, ...data } = input;
  return prisma.$transaction(async (tx: TxClient) => {
    if (mediaAssetIds !== undefined) await syncEventMedia(tx, id, mediaAssetIds);
    return tx.scheduleEvent.update({ where: { id }, data: { ...data, lastModifiedBy: userId }, include: eventInclude });
  });
}

export async function softDeleteEvent(id: string) {
  return prisma.scheduleEvent.update({ where: { id }, data: { isDeleted: true } });
}

