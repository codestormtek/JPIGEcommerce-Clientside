import prisma from '../../lib/prisma';
import { CreateRecipientInput, UpdateRecipientInput } from './order-notifications.schema';

export async function findAll() {
  return prisma.orderNotificationRecipient.findMany({
    orderBy: { createdAt: 'asc' },
  });
}

export async function findActive() {
  return prisma.orderNotificationRecipient.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
  });
}

export async function findById(id: string) {
  return prisma.orderNotificationRecipient.findUnique({ where: { id } });
}

export async function create(data: CreateRecipientInput) {
  return prisma.orderNotificationRecipient.create({
    data: {
      label: data.label ?? null,
      phoneNumber: data.phoneNumber.trim(),
      isActive: data.isActive ?? true,
    },
  });
}

export async function update(id: string, data: UpdateRecipientInput) {
  return prisma.orderNotificationRecipient.update({
    where: { id },
    data: {
      ...(data.label !== undefined ? { label: data.label } : {}),
      ...(data.phoneNumber !== undefined ? { phoneNumber: data.phoneNumber.trim() } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    },
  });
}

export async function remove(id: string) {
  return prisma.orderNotificationRecipient.delete({ where: { id } });
}
