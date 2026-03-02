import prisma from '../../lib/prisma';
import { ListAuditLogsInput } from './audit-logs.schema';

const auditLogInclude = {
  user: { select: { id: true, emailAddress: true } },
} as const;

export async function findAuditLogs(input: ListAuditLogsInput) {
  const { page, limit, userId, action, entityType, entityId, from, to, orderBy, order } = input;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (userId) where['userId'] = userId;
  if (action) where['action'] = { contains: action, mode: 'insensitive' };
  if (entityType) where['entityType'] = { contains: entityType, mode: 'insensitive' };
  if (entityId) where['entityId'] = entityId;
  if (from || to) {
    where['createdAt'] = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }

  const [data, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: auditLogInclude,
      orderBy: { [orderBy]: order },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function findAuditLogById(id: string) {
  return prisma.auditLog.findUnique({ where: { id }, include: auditLogInclude });
}

