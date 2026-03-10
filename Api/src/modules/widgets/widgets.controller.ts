import { Request, Response } from 'express';
import { AuthRequest } from '../../types';
import { sendSuccess, sendCreated, sendNoContent } from '../../utils/apiResponse';
import type { ListWidgetsInput, CreateWidgetInput, UpdateWidgetInput, CreateWidgetItemInput, UpdateWidgetItemInput } from './widgets.schema';
import * as service from './widgets.service';

export async function getPublicWidget(req: Request, res: Response): Promise<void> {
  const widget = await service.getWidgetByPlacement(req.params['placement'] as string);
  sendSuccess(res, widget);
}

export async function listWidgets(req: Request, res: Response): Promise<void> {
  const result = await service.listWidgets(req.query as unknown as ListWidgetsInput);
  res.status(200).json({
    success: true,
    data: result.data,
    meta: {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    },
  });
}

export async function getWidgetById(req: Request, res: Response): Promise<void> {
  const widget = await service.getWidgetById(req.params['id'] as string);
  sendSuccess(res, widget);
}

export async function createWidget(req: AuthRequest, res: Response): Promise<void> {
  const widget = await service.createWidget(req.body as CreateWidgetInput);
  sendCreated(res, widget, 'Widget created');
}

export async function updateWidget(req: AuthRequest, res: Response): Promise<void> {
  const widget = await service.updateWidget(req.params['id'] as string, req.body as UpdateWidgetInput);
  sendSuccess(res, widget, 'Widget updated');
}

export async function deleteWidget(req: AuthRequest, res: Response): Promise<void> {
  await service.deleteWidget(req.params['id'] as string);
  sendNoContent(res);
}

export async function createWidgetItem(req: AuthRequest, res: Response): Promise<void> {
  const item = await service.createWidgetItem(req.params['id'] as string, req.body as CreateWidgetItemInput);
  sendCreated(res, item, 'Widget item created');
}

export async function updateWidgetItem(req: AuthRequest, res: Response): Promise<void> {
  const item = await service.updateWidgetItem(
    req.params['id'] as string,
    req.params['itemId'] as string,
    req.body as UpdateWidgetItemInput
  );
  sendSuccess(res, item, 'Widget item updated');
}

export async function deleteWidgetItem(req: AuthRequest, res: Response): Promise<void> {
  await service.deleteWidgetItem(req.params['id'] as string, req.params['itemId'] as string);
  sendNoContent(res);
}
