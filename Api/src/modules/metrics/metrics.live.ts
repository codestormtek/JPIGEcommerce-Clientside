/**
 * LiveMetricsProvider — queries transactional tables directly.
 * Results are cached by the MetricsService (30–120 s TTL).
 */

import prisma from '../../lib/prisma';
import { config } from '../../config';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OrdersByStatus {
  status: string;
  count: number;
}

export interface LiveSummary {
  ordersToday: number;
  ordersThisWeek: number;
  revenueToday: number;
  revenueThisWeek: number;
  openOrdersByStatus: OrdersByStatus[];
  lowStockCount: number;
  refundsLast7dTotal: number;
  refundsLast7dCount: number;
  newCustomersLast30d: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function startOfDayUtc(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function daysAgoUtc(days: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return startOfDayUtc(d);
}

function startOfWeekUtc(): Date {
  const now = new Date();
  const dow = now.getUTCDay(); // 0=Sun
  return daysAgoUtc(dow);
}

// ─── Provider ────────────────────────────────────────────────────────────────

export async function getLiveMetricsSummary(): Promise<LiveSummary> {
  const todayStart = startOfDayUtc(new Date());
  const weekStart = startOfWeekUtc();
  const last7d = daysAgoUtc(7);
  const last30d = daysAgoUtc(30);

  const [
    ordersToday,
    ordersThisWeek,
    revToday,
    revWeek,
    openOrders,
    lowStockCount,
    refunds,
    newCustomers,
  ] = await Promise.all([
    // Orders placed today
    prisma.shopOrder.count({ where: { orderDate: { gte: todayStart } } }),

    // Orders placed this calendar week
    prisma.shopOrder.count({ where: { orderDate: { gte: weekStart } } }),

    // Revenue today (sum of grandTotal)
    prisma.shopOrder.aggregate({
      _sum: { grandTotal: true },
      where: { orderDate: { gte: todayStart } },
    }),

    // Revenue this week
    prisma.shopOrder.aggregate({
      _sum: { grandTotal: true },
      where: { orderDate: { gte: weekStart } },
    }),

    // Open orders grouped by status (all orders whose status is not "completed"/"cancelled")
    prisma.shopOrder.findMany({
      select: { orderStatus: { select: { status: true } } },
      where: {
        orderStatus: {
          status: { notIn: ['completed', 'cancelled', 'refunded'] },
        },
      },
    }),

    // Products / items with qty at or below low-stock threshold
    prisma.productItem.count({
      where: { qtyInStock: { lte: config.jobs.lowStockThreshold }, isPublished: true },
    }),

    // Refunds (payments with status=refunded) in last 7 days
    prisma.payment.aggregate({
      _sum: { amount: true },
      _count: { id: true },
      where: { status: 'refunded', createdAt: { gte: last7d } },
    }),

    // New customers (SiteUsers created in last 30 days)
    prisma.siteUser.count({ where: { createdAt: { gte: last30d }, isDeleted: false } }),
  ]);

  // Aggregate open orders by status name
  const statusMap = new Map<string, number>();
  for (const row of openOrders) {
    const s = row.orderStatus.status;
    statusMap.set(s, (statusMap.get(s) ?? 0) + 1);
  }
  const openOrdersByStatus: OrdersByStatus[] = Array.from(statusMap.entries()).map(
    ([status, count]) => ({ status, count }),
  );

  return {
    ordersToday,
    ordersThisWeek,
    revenueToday: Number(revToday._sum.grandTotal ?? 0),
    revenueThisWeek: Number(revWeek._sum.grandTotal ?? 0),
    openOrdersByStatus,
    lowStockCount,
    refundsLast7dTotal: Number(refunds._sum.amount ?? 0),
    refundsLast7dCount: refunds._count.id,
    newCustomersLast30d: newCustomers,
  };
}

