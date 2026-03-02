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

import { getLiveMetricsSummary, LiveSummary } from './metrics.live';
import {
  getAggregateSummary,
  getTimeseries,
  getTopProducts,
  AggregateSummary,
  TimeseriesPoint,
  TopProduct,
} from './metrics.aggregate';

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

/** Top products by revenue over a date range (live grouped query). */
export async function getTopProductsService(
  from: Date,
  to: Date,
  limit: number,
): Promise<TopProduct[]> {
  return getTopProducts(from, to, limit);
}

