import { Response } from 'express';
import { AuthRequest } from '../../types';
import { sendSuccess } from '../../utils/apiResponse';
import { SummaryQuery, TimeseriesQuery, TopProductsQuery } from './metrics.schema';
import * as service from './metrics.service';

/**
 * GET /api/v1/admin/metrics/summary?range=today|7d|30d
 *
 * today → live transactional query
 * 7d|30d → MetricDaily aggregates
 */
export async function getSummary(req: AuthRequest, res: Response): Promise<void> {
  const { range } = req.query as unknown as SummaryQuery;

  if (range === 'today') {
    const data = await service.getLiveSummary();
    sendSuccess(res, data);
    return;
  }

  const data = await service.getRangeSummary(range);
  sendSuccess(res, data);
}

/**
 * GET /api/v1/admin/metrics/timeseries?metricKey=&from=&to=
 */
export async function getTimeseries(req: AuthRequest, res: Response): Promise<void> {
  const { metricKey, from, to, currency, channel } = req.query as unknown as TimeseriesQuery;
  const data = await service.getMetricTimeseries(
    metricKey,
    new Date(from),
    new Date(to),
    currency,
    channel,
  );
  sendSuccess(res, data);
}

/**
 * GET /api/v1/admin/metrics/top-products?from=&to=&limit=&sortBy=amount|quantity
 */
export async function getTopProducts(req: AuthRequest, res: Response): Promise<void> {
  const { from, to, limit, sortBy } = req.query as unknown as TopProductsQuery;
  const data = await service.getTopProductsService(new Date(from), new Date(to), limit, sortBy);
  sendSuccess(res, data);
}

/**
 * GET /api/v1/admin/metrics/open-orders
 * Convenience endpoint — subset of live summary.
 */
export async function getOpenOrders(req: AuthRequest, res: Response): Promise<void> {
  const summary = await service.getLiveSummary();
  sendSuccess(res, { openOrdersByStatus: summary.openOrdersByStatus });
}

/**
 * GET /api/v1/admin/metrics/order-totals
 * Order totals by status across time ranges (NopCommerce-style).
 */
export async function getOrderTotals(req: AuthRequest, res: Response): Promise<void> {
  const data = await service.getOrderTotals();
  sendSuccess(res, data);
}

/**
 * GET /api/v1/admin/metrics/incomplete-orders
 * Incomplete orders summary (unpaid, not shipped, incomplete).
 */
export async function getIncompleteOrders(req: AuthRequest, res: Response): Promise<void> {
  const data = await service.getIncompleteOrdersSummary();
  sendSuccess(res, data);
}

/**
 * GET /api/v1/admin/metrics/common-stats
 * Common statistics (total orders, customers, low stock).
 */
export async function getCommonStats(req: AuthRequest, res: Response): Promise<void> {
  const data = await service.getCommonStats();
  sendSuccess(res, data);
}

