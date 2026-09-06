/**
 * MetricsService — orchestrates live and aggregate providers.
 *
 * Routing logic:
 *  - "today" range → always LiveMetricsProvider (no aggregate rows yet for today)
 *  - "7d" / "30d" → AggregateSummary from MetricDaily
 *  - timeseries → always MetricDaily (AggregateMetricsProvider)
 *  - top-products → live grouped query
 *  - open-orders → live
 */

import {
  getLiveMetricsSummary,
  LiveSummary,
  getOrderTotalsByStatus,
  OrderTotalRow,
  getIncompleteOrders,
  IncompleteOrdersSummary,
  getCommonStatistics,
  CommonStats,
} from './metrics.live';
import {
  getAggregateSummary,
  getTimeseries,
  getTopProducts,
  AggregateSummary,
  TimeseriesPoint,
  TopProduct,
} from './metrics.aggregate';
import prisma from '../../lib/prisma';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rangeToDateRange(range: '7d' | '30d'): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - (range === '7d' ? 7 : 30));
  from.setUTCHours(0, 0, 0, 0);
  return { from, to };
}

// ─── Public service functions ─────────────────────────────────────────────────

/** Live summary: orders, revenue, open orders, low stock, refunds, new customers. */
export async function getLiveSummary(): Promise<LiveSummary> {
  return getLiveMetricsSummary();
}

/** Aggregate summary for 7d or 30d ranges. */
export async function getRangeSummary(range: '7d' | '30d'): Promise<AggregateSummary> {
  const { from, to } = rangeToDateRange(range);
  return getAggregateSummary(from, to);
}

/** Daily timeseries for a metric key over a date range. */
export async function getMetricTimeseries(
  metricKey: string,
  from: Date,
  to: Date,
  currency?: string,
  channel?: string,
): Promise<TimeseriesPoint[]> {
  return getTimeseries(metricKey, from, to, currency, channel);
}

/** Top products by revenue or quantity over a date range (live grouped query). */
export async function getTopProductsService(
  from: Date,
  to: Date,
  limit: number,
  sortBy: 'amount' | 'quantity' = 'amount',
): Promise<TopProduct[]> {
  return getTopProducts(from, to, limit, sortBy);
}

/** Order totals by status across time ranges (NopCommerce-style). */
export async function getOrderTotals(): Promise<OrderTotalRow[]> {
  return getOrderTotalsByStatus();
}

/** Incomplete orders summary (unpaid, not shipped, incomplete). */
export async function getIncompleteOrdersSummary(): Promise<IncompleteOrdersSummary> {
  return getIncompleteOrders();
}

/** Common statistics (total orders, registered customers, low stock). */
export async function getCommonStats(): Promise<CommonStats> {
  return getCommonStatistics();
}

type KioskCountRow = {
  sessions: bigint;
  cart_started: bigint;
  abandoned_carts: bigint;
  timeout_resets: bigint;
  payment_failures: bigint;
  side_edits: bigint;
  checkouts_started: bigint;
  checkouts_completed: bigint;
  average_checkout_duration_ms: number | null;
};

/** Aggregate-only operational kiosk analytics; never exposes device/session rows. */
export async function getKioskAnalytics(days: number) {
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - (days - 1));
  from.setUTCHours(0, 0, 0, 0);

  const [totalsRows, dailyRows, popularSideRows, failureRows] = await Promise.all([
    prisma.$queryRaw<KioskCountRow[]>`
      SELECT
        COUNT(DISTINCT ("kioskDeviceId", "sessionId"))
          FILTER (WHERE "eventType" = 'session_started') AS sessions,
        COUNT(*) FILTER (WHERE "eventType" = 'cart_started') AS cart_started,
        COUNT(*) FILTER (WHERE "eventType" = 'cart_abandoned') AS abandoned_carts,
        COUNT(*) FILTER (WHERE "eventType" = 'timeout_reset') AS timeout_resets,
        COUNT(*) FILTER (WHERE "eventType" = 'checkout_failed') AS payment_failures,
        COUNT(*) FILTER (WHERE "eventType" = 'side_edit') AS side_edits,
        COUNT(*) FILTER (WHERE "eventType" = 'checkout_started') AS checkouts_started,
        COUNT(*) FILTER (WHERE "eventType" = 'checkout_completed') AS checkouts_completed,
        AVG("durationMs") FILTER (
          WHERE "eventType" = 'checkout_completed' AND "durationMs" IS NOT NULL
        )::double precision AS average_checkout_duration_ms
      FROM "kiosk_analytics_events"
      WHERE "occurredAt" >= ${from}
    `,
    prisma.$queryRaw<Array<KioskCountRow & { day: Date }>>`
      SELECT
        date_trunc('day', "occurredAt" AT TIME ZONE 'UTC') AS day,
        COUNT(DISTINCT ("kioskDeviceId", "sessionId"))
          FILTER (WHERE "eventType" = 'session_started') AS sessions,
        COUNT(*) FILTER (WHERE "eventType" = 'cart_started') AS cart_started,
        COUNT(*) FILTER (WHERE "eventType" = 'cart_abandoned') AS abandoned_carts,
        COUNT(*) FILTER (WHERE "eventType" = 'timeout_reset') AS timeout_resets,
        COUNT(*) FILTER (WHERE "eventType" = 'checkout_failed') AS payment_failures,
        COUNT(*) FILTER (WHERE "eventType" = 'side_edit') AS side_edits,
        COUNT(*) FILTER (WHERE "eventType" = 'checkout_started') AS checkouts_started,
        COUNT(*) FILTER (WHERE "eventType" = 'checkout_completed') AS checkouts_completed,
        AVG("durationMs") FILTER (
          WHERE "eventType" = 'checkout_completed' AND "durationMs" IS NOT NULL
        )::double precision AS average_checkout_duration_ms
      FROM "kiosk_analytics_events"
      WHERE "occurredAt" >= ${from}
      GROUP BY 1
      ORDER BY 1
    `,
    prisma.$queryRaw<Array<{ product_id: string; product_name: string; selections: bigint }>>`
      SELECT p."id" AS product_id, p."name" AS product_name, COUNT(*) AS selections
      FROM "kiosk_analytics_events" e
      JOIN "products" p ON p."id" = e."sideProductId"
      WHERE e."occurredAt" >= ${from}
        AND e."eventType" = 'side_selected'
      GROUP BY p."id", p."name"
      ORDER BY selections DESC, p."name" ASC
      LIMIT 20
    `,
    prisma.$queryRaw<Array<{ category: string; count: bigint }>>`
      SELECT ("metadata" ->> 'failureCategory') AS category, COUNT(*) AS count
      FROM "kiosk_analytics_events"
      WHERE "occurredAt" >= ${from}
        AND "eventType" = 'checkout_failed'
      GROUP BY 1
      ORDER BY count DESC, category ASC
    `,
  ]);

  const row = totalsRows[0]!;
  const count = (value: bigint) => Number(value);
  const rate = (numerator: bigint, denominator: bigint) =>
    denominator === 0n ? 0 : Number((Number(numerator) / Number(denominator)).toFixed(4));
  const dailyByDate = new Map(dailyRows.map((item) => [
    new Date(item.day).toISOString().slice(0, 10),
    item,
  ]));
  const daily = Array.from({ length: days }, (_, index) => {
    const date = new Date(from);
    date.setUTCDate(date.getUTCDate() + index);
    const dateKey = date.toISOString().slice(0, 10);
    const item = dailyByDate.get(dateKey);
    return {
      date: dateKey,
      sessions: item ? count(item.sessions) : 0,
      cartStarted: item ? count(item.cart_started) : 0,
      abandonedCarts: item ? count(item.abandoned_carts) : 0,
      timeoutResets: item ? count(item.timeout_resets) : 0,
      paymentFailures: item ? count(item.payment_failures) : 0,
      sideEdits: item ? count(item.side_edits) : 0,
      checkoutsStarted: item ? count(item.checkouts_started) : 0,
      checkoutsCompleted: item ? count(item.checkouts_completed) : 0,
      averageCheckoutDurationMs:
        item?.average_checkout_duration_ms == null
          ? null
          : Math.round(item.average_checkout_duration_ms),
    };
  });

  return {
    days,
    from: from.toISOString(),
    to: new Date().toISOString(),
    totals: {
      sessions: count(row.sessions),
      abandonedCarts: count(row.abandoned_carts),
      timeoutResets: count(row.timeout_resets),
      paymentFailures: count(row.payment_failures),
      sideEdits: count(row.side_edits),
      averageCheckoutDurationMs:
        row.average_checkout_duration_ms == null
          ? null
          : Math.round(row.average_checkout_duration_ms),
    },
    rates: {
      cartAbandonment: rate(row.abandoned_carts, row.cart_started),
      timeoutResetPerSession: rate(row.timeout_resets, row.sessions),
      paymentFailure: rate(row.payment_failures, row.checkouts_started),
      checkoutCompletion: rate(row.checkouts_completed, row.checkouts_started),
      sideEditsPerSession: rate(row.side_edits, row.sessions),
    },
    daily,
    popularSides: popularSideRows.map((item) => ({
      productId: item.product_id,
      productName: item.product_name,
      selections: count(item.selections),
    })),
    failureCategories: failureRows.map((item) => ({
      category: item.category,
      count: count(item.count),
    })),
  };
}

