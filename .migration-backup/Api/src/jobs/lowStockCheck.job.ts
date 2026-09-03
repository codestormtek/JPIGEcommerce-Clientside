import prisma from '../lib/prisma';
import { config } from '../config';
import { AuditAction, logAudit } from '../utils/auditLogger';
import { logger } from '../utils/logger';

/**
 * Repeatable job — runs hourly.
 * 1. Finds all product items at or below the low-stock threshold.
 * 2. If autoDisableOutOfStock is enabled, unpublishes items with 0 stock.
 * 3. Sends an in-app UserNotification to every active admin.
 */
export async function lowStockCheckProcessor(): Promise<void> {
  const { lowStockThreshold, autoDisableOutOfStock } = config.jobs;

  const lowStockItems = await prisma.productItem.findMany({
    where: { qtyInStock: { lte: lowStockThreshold } },
    include: { product: { select: { name: true } } },
  });

  if (lowStockItems.length === 0) {
    logger.info('lowStockCheck: no low-stock items found');
    return;
  }

  // Auto-disable published items that are fully out of stock
  if (autoDisableOutOfStock) {
    const toDisableIds = lowStockItems
      .filter((item) => item.qtyInStock === 0 && item.isPublished)
      .map((item) => item.id);

    if (toDisableIds.length > 0) {
      await prisma.productItem.updateMany({
        where: { id: { in: toDisableIds } },
        data: { isPublished: false },
      });

      for (const id of toDisableIds) {
        logAudit({
          action: AuditAction.PRODUCT_ITEM_DISABLED,
          entityType: 'ProductItem',
          entityId: id,
          afterJson: { reason: 'out_of_stock', autoDisabled: true },
        });
      }

      logger.info('lowStockCheck: auto-disabled out-of-stock items', { count: toDisableIds.length });
    }
  }

  // Send in-app notifications to all active admins
  const admins = await prisma.siteUser.findMany({
    where: { role: 'admin', isActive: true, isDeleted: false },
    select: { id: true },
  });

  if (admins.length === 0) {
    logger.info('lowStockCheck: no admins to notify');
    return;
  }

  const itemSummary = lowStockItems
    .map((item) => `${item.sku} (${item.product.name}): ${item.qtyInStock} left`)
    .join(' | ');

  await prisma.userNotification.createMany({
    data: admins.map((admin) => ({
      userId: admin.id,
      title: `Low Stock Alert — ${lowStockItems.length} item(s) need attention`,
      message: itemSummary,
      isRead: false,
    })),
  });

  logger.info('lowStockCheck: admin notifications sent', {
    itemCount: lowStockItems.length,
    adminCount: admins.length,
  });
}

