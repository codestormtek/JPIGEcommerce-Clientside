import prisma from '../../lib/prisma';
import { ListPagesInput, CreatePageInput, UpdatePageInput } from './pages.schema';

export async function findPages(input: ListPagesInput) {
  const { page, limit, search, orderBy, order } = input;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { isDeleted: false };
  if (search) {
    where['OR'] = [
      { title: { contains: search, mode: 'insensitive' } },
      { slug: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.sitePage.findMany({ where, orderBy: { [orderBy]: order }, skip, take: limit }),
    prisma.sitePage.count({ where }),
  ]);
  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function findPageById(id: string) {
  return prisma.sitePage.findFirst({ where: { id, isDeleted: false } });
}

export async function findPageBySlug(slug: string) {
  return prisma.sitePage.findFirst({ where: { slug, isDeleted: false } });
}

export async function createPage(input: CreatePageInput) {
  return prisma.sitePage.create({ data: input });
}

export async function updatePage(id: string, input: UpdatePageInput) {
  return prisma.sitePage.update({ where: { id }, data: input });
}

export async function softDeletePage(id: string) {
  return prisma.sitePage.update({ where: { id }, data: { isDeleted: true } });
}
