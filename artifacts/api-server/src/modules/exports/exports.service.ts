import { ApiError } from '../../utils/apiError';
import { readFileStream, saveFile, storageKeyExists } from '../../lib/storage';
import { logAudit, AuditAction, AuditContext } from '../../utils/auditLogger';
import { logger } from '../../utils/logger';
import { writeExport, ExportFormat } from '../../services/exportWriters';
import prisma from '../../lib/prisma';
import { config } from '../../config';
import * as repo from './exports.repository';
import type { CreateExportInput, ListExportsInput } from './exports.schema';

// ─── Data fetchers (inline, no Redis/BullMQ) ──────────────────────────────────

type Filters = Record<string, string | undefined>;

async function fetchOrders(filters: Filters) {
  const where: Record<string, unknown> = {};
  if (filters['statusId']) where['orderStatusId'] = filters['statusId'];
  const rows = await prisma.shopOrder.findMany({
    where,
    take: config.exports.maxRows,
    include: {
      user: { select: { emailAddress: true } },
      orderStatus: { select: { status: true } },
    },
    orderBy: { orderDate: 'desc' },
  });
  return rows.map((o) => ({
    'Order ID': o.id,
    'Date': o.orderDate.toISOString(),
    'Customer': o.user?.emailAddress ?? '',
    'Status': o.orderStatus?.status ?? o.orderStatusId,
    'Subtotal': o.subtotal.toString(),
    'Discount': o.discountTotal.toString(),
    'Tax': o.taxTotal.toString(),
    'Total': o.grandTotal.toString(),
  }));
}

async function fetchProducts(filters: Filters) {
  const where: Record<string, unknown> = {};
  if (filters['published'] !== undefined) where['isPublished'] = filters['published'] === 'true';
  const rows = await prisma.productItem.findMany({
    where,
    take: config.exports.maxRows,
    include: { product: { select: { name: true } } },
    orderBy: { sku: 'asc' },
  });
  return rows.map((i) => ({
    'Item ID': i.id,
    'Product': i.product?.name ?? '',
    'SKU': i.sku ?? '',
    'Price': i.price.toString(),
    'Stock': i.qtyInStock,
    'Published': i.isPublished,
  }));
}

async function fetchUsers(filters: Filters) {
  const where: Record<string, unknown> = { isDeleted: false };
  if (filters['role']) where['role'] = filters['role'];
  const rows = await prisma.siteUser.findMany({
    where,
    take: config.exports.maxRows,
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((u) => ({
    'User ID': u.id,
    'Email': u.emailAddress,
    'Role': u.role,
    'Active': u.isActive,
    'Registered': u.createdAt.toISOString(),
  }));
}

async function fetchPromotions() {
  const rows = await prisma.promotion.findMany({
    take: config.exports.maxRows,
    orderBy: { name: 'asc' },
  });
  return rows.map((p) => ({
    'ID': p.id,
    'Name': p.name,
    'Type': p.promotionType,
    'Discount Rate': p.discountRate?.toString() ?? '',
    'Min Subtotal': p.minSubtotal?.toString() ?? '',
    'Start Date': p.startDate?.toISOString() ?? '',
    'End Date': p.endDate?.toISOString() ?? '',
    'Active': p.isActive,
  }));
}

/**
 * Processes an export job: fetches data, writes file, updates DB record.
 * Runs fire-and-forget — caller does NOT await this.
 */
async function processExport(exportJobId: string): Promise<void> {
  await prisma.exportJob.update({
    where: { id: exportJobId },
    data: { status: 'processing' },
  });

  try {
    const exportJob = await prisma.exportJob.findUniqueOrThrow({ where: { id: exportJobId } });
    const filters: Filters = exportJob.filtersJson ? (JSON.parse(exportJob.filtersJson) as Filters) : {};

    let rows: Record<string, unknown>[];
    switch (exportJob.resource) {
      case 'orders':     rows = await fetchOrders(filters); break;
      case 'products':   rows = await fetchProducts(filters); break;
      case 'users':      rows = await fetchUsers(filters); break;
      case 'promotions': rows = await fetchPromotions(); break;
      default: throw new Error(`Unknown export resource: ${exportJob.resource}`);
    }

    const result = await writeExport(rows as Parameters<typeof writeExport>[0], exportJob.format as ExportFormat);
    const storageKey = `exports/${exportJobId}.${result.extension}`;
    saveFile(storageKey, result.buffer);

    await prisma.exportJob.update({
      where: { id: exportJobId },
      data: { status: 'done', storageKey, rowCount: rows.length, completedAt: new Date() },
    });

    logger.info(`Export job ${exportJobId} completed — ${rows.length} rows, ${result.extension}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.exportJob.update({
      where: { id: exportJobId },
      data: { status: 'failed', errorMessage: message, completedAt: new Date() },
    }).catch(() => undefined);
    logger.error(`Export job ${exportJobId} failed`, { err });
  }
}

// ─── Public service functions ─────────────────────────────────────────────────

export async function createExport(
  input: CreateExportInput,
  requestedByUserId: string | undefined,
  ctx?: AuditContext,
) {
  const { resource, format, filters } = input;

  const job = await repo.createExportJob({
    resource,
    format,
    requestedByUserId,
    filtersJson: filters ? JSON.stringify(filters) : undefined,
  });

  // Fire-and-forget — process in background without blocking the response
  processExport(job.id).catch((err: unknown) =>
    logger.error('createExport: unhandled processExport error', { exportJobId: job.id, err }),
  );

  logAudit({
    action: AuditAction.EXPORT_REQUESTED,
    entityType: 'ExportJob',
    entityId: job.id,
    afterJson: { resource, format },
    ctx,
  });

  return job;
}

export async function getExport(id: string) {
  const job = await repo.findExportJobById(id);
  if (!job) throw ApiError.notFound('Export job');
  return job;
}

export async function listExports(input: ListExportsInput) {
  return repo.findExportJobs(input);
}

export async function downloadExport(id: string) {
  const job = await getExport(id);
  if (job.status !== 'done') {
    throw ApiError.badRequest(`Export is not ready (status: ${job.status})`);
  }
  if (!job.storageKey || !storageKeyExists(job.storageKey)) {
    throw ApiError.notFound('Export file');
  }
  return { job, stream: readFileStream(job.storageKey) };
}

