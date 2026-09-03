import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  createDashboardSchema,
  updateDashboardSchema,
  createWidgetSchema,
  updateWidgetSchema,
} from './dashboards.schema';
import * as ctrl from './dashboards.controller';

export const dashboardsRouter = Router();

// All dashboard routes are admin-only
dashboardsRouter.use(authenticate, authorize('admin'));

// ─── Dashboards ───────────────────────────────────────────────────────────────

// GET  /api/v1/admin/dashboards
dashboardsRouter.get('/', asyncHandler(ctrl.listDashboards));

// POST /api/v1/admin/dashboards
dashboardsRouter.post('/', validate(createDashboardSchema), asyncHandler(ctrl.createDashboard));

// GET  /api/v1/admin/dashboards/:id
dashboardsRouter.get('/:id', asyncHandler(ctrl.getDashboard));

// PUT  /api/v1/admin/dashboards/:id
dashboardsRouter.put('/:id', validate(updateDashboardSchema), asyncHandler(ctrl.updateDashboard));

// DELETE /api/v1/admin/dashboards/:id  (soft delete → isActive: false)
dashboardsRouter.delete('/:id', asyncHandler(ctrl.deleteDashboard));

// ─── Widgets (nested under dashboards) ───────────────────────────────────────

// POST /api/v1/admin/dashboards/:id/widgets
dashboardsRouter.post(
  '/:id/widgets',
  validate(createWidgetSchema),
  asyncHandler(ctrl.createWidget),
);

// ─── Widget operations (by widgetId) ─────────────────────────────────────────

// PUT    /api/v1/admin/dashboards/widgets/:widgetId
dashboardsRouter.put(
  '/widgets/:widgetId',
  validate(updateWidgetSchema),
  asyncHandler(ctrl.updateWidget),
);

// DELETE /api/v1/admin/dashboards/widgets/:widgetId
dashboardsRouter.delete('/widgets/:widgetId', asyncHandler(ctrl.deleteWidget));

// POST   /api/v1/admin/dashboards/widgets/:widgetId/data
dashboardsRouter.post('/widgets/:widgetId/data', asyncHandler(ctrl.getWidgetData));

