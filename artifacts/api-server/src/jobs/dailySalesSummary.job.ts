import prisma from '../lib/prisma';
import { logger } from '../utils/logger';

/**
 * Repeatable job — runs daily at 6 AM.
 * Aggregates the previous day's orders and pushes a summary
 * UserNotification to every active admin.
 */
export async function dailySalesSummaryProcessor(): Promise<void> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const start = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
  const end = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() + 1);

  const orders = await prisma.shopOrder.findMany({
    where: { orderDate: { gte: start, lt: end } },
    select: {
      grandTotal: true,
      discountTotal: true,
      taxTotal: true,
      shippingTotal: true,
    },
  });

  const count = orders.length;

  if (count === 0) {
    logger.info('dailySalesSummary: no orders found for yesterday', {
      date: start.toISOString().slice(0, 10),
    });
    return;
  }

  const revenue = orders.reduce((sum, o) => sum + Number(o.grandTotal), 0);
  const discounts = orders.reduce((sum, o) => sum + Number(o.discountTotal), 0);
  const taxes = orders.reduce((sum, o) => sum + Number(o.taxTotal), 0);
  const shipping = orders.reduce((sum, o) => sum + Number(o.shippingTotal), 0);
  const avgOrder = revenue / count;

  const admins = await prisma.siteUser.findMany({
    where: { role: 'admin', isActive: true, isDeleted: false },
    select: { id: true },
  });

  if (admins.length === 0) {
    logger.info('dailySalesSummary: no admins to notify');
    return;
  }

  const dateLabel = start.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const message =
    `Orders: ${count} | Revenue: $${revenue.toFixed(2)} | Avg: $${avgOrder.toFixed(2)} | ` +
    `Discounts: $${discounts.toFixed(2)} | Tax: $${taxes.toFixed(2)} | Shipping: $${shipping.toFixed(2)}`;

  await prisma.userNotification.createMany({
    data: admins.map((admin) => ({
      userId: admin.id,
      title: `Daily Sales Summary — ${dateLabel}`,
      message,
      isRead: false,
    })),
  });

  logger.info('dailySalesSummary: summary sent', {
    date: dateLabel,
    orderCount: count,
    revenue,
    adminCount: admins.length,
  });
}

