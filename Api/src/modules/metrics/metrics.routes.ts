import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import { summaryQuerySchema, timeseriesQuerySchema, topProductsQuerySchema } from './metrics.schema';
import * as ctrl from './metrics.controller';

export const metricsRouter = Router();

// All metrics routes are admin-only
metricsRouter.use(authenticate, authorize('admin'));

// GET /api/v1/admin/metrics/summary?range=today|7d|30d
metricsRouter.get('/summary', validate(summaryQuerySchema, 'query'), asyncHandler(ctrl.getSummary));

// GET /api/v1/admin/metrics/timeseries?metricKey=gross_sales&from=...&to=...
metricsRouter.get('/timeseries', validate(timeseriesQuerySchema, 'query'), asyncHandler(ctrl.getTimeseries));

// GET /api/v1/admin/metrics/top-products?from=...&to=...&limit=10
metricsRouter.get('/top-products', validate(topProductsQuerySchema, 'query'), asyncHandler(ctrl.getTopProducts));

// GET /api/v1/admin/metrics/open-orders
metricsRouter.get('/open-orders', asyncHandler(ctrl.getOpenOrders));

// GET /api/v1/admin/metrics/order-totals
metricsRouter.get('/order-totals', asyncHandler(ctrl.getOrderTotals));

// GET /api/v1/admin/metrics/incomplete-orders
metricsRouter.get('/incomplete-orders', asyncHandler(ctrl.getIncompleteOrders));

// GET /api/v1/admin/metrics/common-stats
metricsRouter.get('/common-stats', asyncHandler(ctrl.getCommonStats));

