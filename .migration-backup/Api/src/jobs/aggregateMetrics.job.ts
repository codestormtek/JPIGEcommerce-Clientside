/**
 * aggregateMetrics.job.ts — nightly ETL job.
 *
 * Computes the previous day's key metrics from transactional tables and
 * upserts them into MetricDaily. Designed to run at 01:00 UTC so that all
 * orders for "yesterday" are fully settled before aggregation.
 *
 * MetricDaily keys written:
 *   gross_sales       — sum of grandTotal for all orders on that day
 *   net_sales         — gross_sales − discount_total − refund_total
 *   orders_count      — count of orders on that day
 *   discount_total    — sum of discountTotal
 *   tax_total         — sum of taxTotal
 *   shipping_total    — sum of shippingTotal
 *   refund_total      — sum of Payment.amount where status = 'refunded'
 *   new_customers     — count of new SiteUser registrations
 */

import prisma from '../lib/prisma';
import { logger } from '../utils/logger';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DayRange {
  gte: Date;
  lt: Date;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function yesterdayRange(): { dayStart: Date; dayRange: DayRange } {
  const now = new Date();
  const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
  const dayEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return { dayStart, dayRange: { gte: dayStart, lt: dayEnd } };
}

async function upsertMetric(metricDate: Date, metricKey: string, value: number): Promise<void> {
  await prisma.metricDaily.upsert({
    where: {
      metricDate_metricKey_currency_channel: {
        metricDate,
        metricKey,
        currency: null as unknown as string,
        channel: null as unknown as string,
      },
    },
    create: { metricDate, metricKey, valueNumber: value },
    update: { valueNumber: value },
  });
}

// ─── Processor ────────────────────────────────────────────────────────────────

export async function aggregateMetricsProcessor(): Promise<void> {
  const { dayStart, dayRange } = yesterdayRange();
  const label = dayStart.toISOString().slice(0, 10);
  logger.info(`aggregateMetrics: computing metrics for ${label}`);

  // ── Order aggregates ────────────────────────────────────────────────────────
  const [orderAgg, orderCount] = await Promise.all([
    prisma.shopOrder.aggregate({
      _sum: {
        grandTotal: true,
        discountTotal: true,
        taxTotal: true,
        shippingTotal: true,
      },
      where: { orderDate: dayRange },
    }),
    prisma.shopOrder.count({ where: { orderDate: dayRange } }),
  ]);

  const grossSales = Number(orderAgg._sum.grandTotal ?? 0);
  const discountTotal = Number(orderAgg._sum.discountTotal ?? 0);
  const taxTotal = Number(orderAgg._sum.taxTotal ?? 0);
  const shippingTotal = Number(orderAgg._sum.shippingTotal ?? 0);

  // ── Refund aggregates ───────────────────────────────────────────────────────
  const refundAgg = await prisma.payment.aggregate({
    _sum: { amount: true },
    where: { status: 'refunded', createdAt: dayRange },
  });
  const refundTotal = Number(refundAgg._sum.amount ?? 0);

  const netSales = Math.max(0, grossSales - discountTotal - refundTotal);

  // ── New customers ───────────────────────────────────────────────────────────
  const newCustomers = await prisma.siteUser.count({
    where: { createdAt: dayRange, isDeleted: false },
  });

  // ── Upsert all metrics ──────────────────────────────────────────────────────
  await Promise.all([
    upsertMetric(dayStart, 'gross_sales', grossSales),
    upsertMetric(dayStart, 'net_sales', netSales),
    upsertMetric(dayStart, 'orders_count', orderCount),
    upsertMetric(dayStart, 'discount_total', discountTotal),
    upsertMetric(dayStart, 'tax_total', taxTotal),
    upsertMetric(dayStart, 'shipping_total', shippingTotal),
    upsertMetric(dayStart, 'refund_total', refundTotal),
    upsertMetric(dayStart, 'new_customers', newCustomers),
  ]);

  logger.info(`aggregateMetrics: wrote 8 metrics for ${label}`, {
    grossSales, netSales, ordersCount: orderCount, refundTotal, newCustomers,
  });
}

