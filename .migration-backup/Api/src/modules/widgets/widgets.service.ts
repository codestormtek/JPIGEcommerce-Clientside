import { ApiError } from '../../utils/apiError';
import type { ListWidgetsInput, CreateWidgetInput, UpdateWidgetInput, CreateWidgetItemInput, UpdateWidgetItemInput } from './widgets.schema';
import * as repo from './widgets.repository';

export async function listWidgets(input: ListWidgetsInput) {
  return repo.findWidgets(input);
}

export async function getWidgetById(id: string) {
  const widget = await repo.findWidgetById(id);
  if (!widget) throw ApiError.notFound('Widget');
  return widget;
}

export async function getWidgetByPlacement(placement: string) {
  return repo.findWidgetByPlacement(placement);
}

export async function createWidget(input: CreateWidgetInput) {
  return repo.createWidget(input);
}

export async function updateWidget(id: string, input: UpdateWidgetInput) {
  await getWidgetById(id);
  return repo.updateWidget(id, input);
}

export async function deleteWidget(id: string) {
  await getWidgetById(id);
  return repo.softDeleteWidget(id);
}

export async function createWidgetItem(widgetId: string, input: CreateWidgetItemInput) {
  await getWidgetById(widgetId);
  return repo.createWidgetItem(widgetId, input);
}

export async function updateWidgetItem(widgetId: string, itemId: string, input: UpdateWidgetItemInput) {
  await getWidgetById(widgetId);
  const item = await repo.findWidgetItemById(itemId, widgetId);
  if (!item) throw ApiError.notFound('Widget item');
  return repo.updateWidgetItem(itemId, input);
}

export async function deleteWidgetItem(widgetId: string, itemId: string) {
  await getWidgetById(widgetId);
  const item = await repo.findWidgetItemById(itemId, widgetId);
  if (!item) throw ApiError.notFound('Widget item');
  return repo.deleteWidgetItem(itemId);
}
