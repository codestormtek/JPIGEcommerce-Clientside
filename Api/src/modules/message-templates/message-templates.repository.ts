import prisma from '../../lib/prisma';
import { ListMessageTemplatesInput, CreateMessageTemplateInput, UpdateMessageTemplateInput } from './message-templates.schema';

// ─── List ─────────────────────────────────────────────────────────────────────

export async function findMessageTemplates(input: ListMessageTemplatesInput) {
  const { page, limit, channel, audience, isActive, search, orderBy, order } = input;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (channel)             where['channel']  = channel;
  if (audience)            where['audience'] = audience;
  if (isActive !== undefined) where['isActive'] = isActive;
  if (search) {
    where['OR'] = [
      { name:     { contains: search, mode: 'insensitive' } },
      { eventKey: { contains: search, mode: 'insensitive' } },
      { subject:  { contains: search, mode: 'insensitive' } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.messageTemplate.findMany({
      where,
      orderBy: { [orderBy]: order },
      skip,
      take: limit,
    }),
    prisma.messageTemplate.count({ where }),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

// ─── Get by id ────────────────────────────────────────────────────────────────

export async function findMessageTemplateById(id: string) {
  return prisma.messageTemplate.findUnique({ where: { id } });
}

// ─── Find by eventKey (used for sending) ─────────────────────────────────────

export async function findTemplateByEventKey(eventKey: string, channel = 'email') {
  return prisma.messageTemplate.findFirst({
    where: { eventKey, channel, isActive: true },
  });
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createMessageTemplate(input: CreateMessageTemplateInput) {
  return prisma.messageTemplate.create({ data: input });
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateMessageTemplate(id: string, input: UpdateMessageTemplateInput) {
  return prisma.messageTemplate.update({ where: { id }, data: input });
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteMessageTemplate(id: string) {
  return prisma.messageTemplate.delete({ where: { id } });
}

