import { Response } from 'express';
import { AuthRequest } from '../../types';
import { sendSuccess, sendCreated, sendNoContent } from '../../utils/apiResponse';
import { CreateDashboardInput, UpdateDashboardInput, CreateWidgetInput, UpdateWidgetInput } from './dashboards.schema';
import * as service from './dashboards.service';

// ─── Dashboards ───────────────────────────────────────────────────────────────

// GET /api/v1/admin/dashboards
export async function listDashboards(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const data = await service.listDashboards(userId);
  sendSuccess(res, data);
}

// GET /api/v1/admin/dashboards/:id
export async function getDashboard(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;
  const data = await service.getDashboard(id);
  sendSuccess(res, data);
}

// POST /api/v1/admin/dashboards
export async function createDashboard(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const data = await service.createDashboard(req.body as CreateDashboardInput, userId);
  sendCreated(res, data);
}

// PUT /api/v1/admin/dashboards/:id
export async function updateDashboard(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;
  const data = await service.updateDashboard(id, req.body as UpdateDashboardInput);
  sendSuccess(res, data);
}

// DELETE /api/v1/admin/dashboards/:id
export async function deleteDashboard(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;
  await service.deleteDashboard(id);
  sendNoContent(res);
}

// ─── Widgets ──────────────────────────────────────────────────────────────────

// POST /api/v1/admin/dashboards/:id/widgets
export async function createWidget(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;
  const data = await service.createWidget(id, req.body as CreateWidgetInput);
  sendCreated(res, data);
}

// PUT /api/v1/admin/dashboards/widgets/:widgetId
export async function updateWidget(req: AuthRequest, res: Response): Promise<void> {
  const { widgetId } = req.params as Record<string, string>;
  const data = await service.updateWidget(widgetId, req.body as UpdateWidgetInput);
  sendSuccess(res, data);
}

// DELETE /api/v1/admin/dashboards/widgets/:widgetId
export async function deleteWidget(req: AuthRequest, res: Response): Promise<void> {
  const { widgetId } = req.params as Record<string, string>;
  await service.deleteWidget(widgetId);
  sendNoContent(res);
}

// POST /api/v1/admin/dashboards/widgets/:widgetId/data
export async function getWidgetData(req: AuthRequest, res: Response): Promise<void> {
  const { widgetId } = req.params as Record<string, string>;
  const data = await service.getWidgetData(widgetId);
  sendSuccess(res, data);
}

