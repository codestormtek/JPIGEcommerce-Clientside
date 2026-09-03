import prisma from '../../lib/prisma';
import { CreateSocialLinkInput, UpdateSocialLinkInput } from './social-links.schema';

export async function count() {
  return prisma.socialLink.count();
}

export async function findAll() {
  return prisma.socialLink.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
}

export async function findActive() {
  return prisma.socialLink.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
}

export async function findById(id: string) {
  return prisma.socialLink.findUnique({ where: { id } });
}

export async function create(data: CreateSocialLinkInput) {
  return prisma.socialLink.create({
    data: {
      platform: data.platform.trim(),
      iconClass: data.iconClass.trim(),
      url: data.url.trim(),
      sortOrder: data.sortOrder ?? 0,
      isActive: data.isActive ?? true,
    },
  });
}

export async function createMany(
  items: { id: string; platform: string; iconClass: string; url: string; sortOrder: number; isActive: boolean }[]
) {
  return prisma.socialLink.createMany({ data: items, skipDuplicates: true });
}

export async function reorderTx(ids: string[]) {
  return prisma.$transaction(
    ids.map((id, index) => prisma.socialLink.update({ where: { id }, data: { sortOrder: index } }))
  );
}

export async function update(id: string, data: UpdateSocialLinkInput) {
  return prisma.socialLink.update({
    where: { id },
    data: {
      ...(data.platform !== undefined ? { platform: data.platform.trim() } : {}),
      ...(data.iconClass !== undefined ? { iconClass: data.iconClass.trim() } : {}),
      ...(data.url !== undefined ? { url: data.url.trim() } : {}),
      ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    },
  });
}

export async function remove(id: string) {
  return prisma.socialLink.delete({ where: { id } });
}

export async function setSortOrder(id: string, sortOrder: number) {
  return prisma.socialLink.update({ where: { id }, data: { sortOrder } });
}
