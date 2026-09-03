/**
 * AggregateMetricsProvider — reads from MetricDaily (pre-aggregated nightly).
 * Also contains the live "top products" query (grouped order lines).
 */

import prisma from '../../lib/prisma';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TimeseriesPoint {
  date: string;      // YYYY-MM-DD
  value: number;
}

export interface TopProduct {
  productId: string;
  productName: string;
  sku: string;
  totalQty: number;
  totalRevenue: number;
}

export interface AggregateSummary {
  grossSales: number;
  netSales: number;
  ordersCount: number;
  discountTotal: number;
  taxTotal: number;
  shippingTotal: number;
  refundTotal: number;
  newCustomers: number;
}

// ─── Timeseries ──────────────────────────────────────────────────────────────

/**
 * Returns daily data points for a metric key over a date range.
 * Gaps (days with no row in MetricDaily) are NOT filled — UI handles that.
 */
export async function getTimeseries(
  metricKey: string,
  from: Date,
  to: Date,
  currency?: string,
  channel?: string,
): Promise<TimeseriesPoint[]> {
  const rows = await prisma.metricDaily.findMany({
    where: {
      metricKey,
      metricDate: { gte: from, lte: to },
      ...(currency !== undefined ? { currency } : {}),
      ...(channel !== undefined ? { channel } : {}),
    },
    orderBy: { metricDate: 'asc' },
    select: { metricDate: true, valueNumber: true },
  });

  return rows.map((r) => ({
    date: r.metricDate.toISOString().slice(0, 10),
    value: Number(r.valueNumber),
  }));
}

// ─── Aggregate summary over a date range ─────────────────────────────────────

const SUMMARY_KEYS = [
  'gross_sales',
  'net_sales',
  'orders_count',
  'discount_total',
  'tax_total',
  'shipping_total',
  'refund_total',
  'new_customers',
] as const;

type SummaryKey = (typeof SUMMARY_KEYS)[number];

export async function getAggregateSummary(from: Date, to: Date): Promise<AggregateSummary> {
  const rows = await prisma.metricDaily.findMany({
    where: {
      metricKey: { in: [...SUMMARY_KEYS] },
      metricDate: { gte: from, lte: to },
    },
    select: { metricKey: true, valueNumber: true },
  });

  const totals: Record<string, number> = {};
  for (const row of rows) {
    totals[row.metricKey] = (totals[row.metricKey] ?? 0) + Number(row.valueNumber);
  }

  const g = (k: SummaryKey) => totals[k] ?? 0;
  return {
    grossSales: g('gross_sales'),
    netSales: g('net_sales'),
    ordersCount: g('orders_count'),
    discountTotal: g('discount_total'),
    taxTotal: g('tax_total'),
    shippingTotal: g('shipping_total'),
    refundTotal: g('refund_total'),
    newCustomers: g('new_customers'),
  };
}

// ─── Top products (live, grouped query) ──────────────────────────────────────

export async function getTopProducts(
  from: Date,
  to: Date,
  limit = 10,
  sortBy: 'amount' | 'quantity' = 'amount',
): Promise<TopProduct[]> {
  // Group order lines by productItem, aggregate qty + revenue, join product name
  const lines = await prisma.orderLine.findMany({
    where: { order: { orderDate: { gte: from, lte: to } } },
    select: {
      productItemId: true,
      qty: true,
      lineTotal: true,
      skuSnapshot: true,
      productNameSnapshot: true,
      productItem: { select: { product: { select: { id: true } } } },
    },
  });

  const map = new Map<
    string,
    { productId: string; productName: string; sku: string; totalQty: number; totalRevenue: number }
  >();

  for (const line of lines) {
    const productId = line.productItem.product.id;
    const existing = map.get(line.productItemId);
    if (existing) {
      existing.totalQty += line.qty;
      existing.totalRevenue += Number(line.lineTotal);
    } else {
      map.set(line.productItemId, {
        productId,
        productName: line.productNameSnapshot,
        sku: line.skuSnapshot,
        totalQty: line.qty,
        totalRevenue: Number(line.lineTotal),
      });
    }
  }

  return Array.from(map.values())
    .sort((a, b) => sortBy === 'quantity' ? b.totalQty - a.totalQty : b.totalRevenue - a.totalRevenue)
    .slice(0, limit);
}

