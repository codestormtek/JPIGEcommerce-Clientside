import prisma from '../../lib/prisma';
import type { ListExportsInput } from './exports.schema';

export interface CreateExportJobData {
  resource: string;
  format: string;
  requestedByUserId?: string;
  filtersJson?: string;
}

export async function createExportJob(data: CreateExportJobData) {
  return prisma.exportJob.create({ data });
}

export async function findExportJobById(id: string) {
  return prisma.exportJob.findUnique({
    where: { id },
    include: { requestedBy: { select: { id: true, emailAddress: true } } },
  });
}

export async function findExportJobs(input: ListExportsInput) {
  const { page, limit, resource, status } = input;
  const where = {
    ...(resource ? { resource } : {}),
    ...(status ? { status } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.exportJob.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { requestedBy: { select: { id: true, emailAddress: true } } },
    }),
    prisma.exportJob.count({ where }),
  ]);
  return { items, total, page, limit };
}

export async function updateExportJob(
  id: string,
  data: Partial<{ status: string; storageKey: string; rowCount: number; errorMessage: string; completedAt: Date }>,
) {
  return prisma.exportJob.update({ where: { id }, data });
}

