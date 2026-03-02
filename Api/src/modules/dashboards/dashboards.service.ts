import { ApiError } from '../../utils/apiError';
import { CreateDashboardInput, UpdateDashboardInput, CreateWidgetInput, UpdateWidgetInput } from './dashboards.schema';
import * as repo from './dashboards.repository';
import * as metricsService from '../metrics/metrics.service';

// ─── Dashboards ───────────────────────────────────────────────────────────────

export async function listDashboards(ownerUserId: string) {
  return repo.findDashboards(ownerUserId);
}

export async function getDashboard(id: string) {
  const d = await repo.findDashboardById(id);
  if (!d) throw ApiError.notFound('Dashboard');
  return d;
}

export async function createDashboard(data: CreateDashboardInput, ownerUserId: string) {
  return repo.createDashboard(data, ownerUserId);
}

export async function updateDashboard(id: string, data: UpdateDashboardInput) {
  await getDashboard(id); // 404 guard
  return repo.updateDashboard(id, data);
}

export async function deleteDashboard(id: string) {
  await getDashboard(id); // 404 guard
  await repo.deleteDashboard(id);
}

// ─── Widgets ──────────────────────────────────────────────────────────────────

export async function createWidget(dashboardId: string, data: CreateWidgetInput) {
  await getDashboard(dashboardId); // 404 guard
  return repo.createWidget(dashboardId, data);
}

export async function updateWidget(widgetId: string, data: UpdateWidgetInput) {
  const w = await repo.findWidgetById(widgetId);
  if (!w) throw ApiError.notFound('Widget');
  return repo.updateWidget(widgetId, data);
}

export async function deleteWidget(widgetId: string) {
  const w = await repo.findWidgetById(widgetId);
  if (!w) throw ApiError.notFound('Widget');
  await repo.deleteWidget(widgetId);
}

// ─── Widget data resolution ───────────────────────────────────────────────────

/**
 * Resolves live data for a single widget based on its metricKey, source, and
 * configJson. The UI calls POST /dashboards/widgets/:id/data.
 */
export async function getWidgetData(widgetId: string): Promise<unknown> {
  const widget = await repo.findWidgetById(widgetId);
  if (!widget) throw ApiError.notFound('Widget');

  const cfg = (widget.configJson ?? {}) as Record<string, unknown>;
  const metricKey = widget.metricKey;
  const source = widget.source;

  // KPI / open-orders style — live summary
  if (widget.type === 'KPI' && !metricKey) {
    return metricsService.getLiveSummary();
  }

  // KPI with explicit metricKey — pull aggregate summary and return one key
  if (widget.type === 'KPI' && metricKey) {
    const range = (cfg['range'] as '7d' | '30d') ?? '7d';
    if (source === 'LIVE') {
      const live = await metricsService.getLiveSummary();
      return live;
    }
    const summary = await metricsService.getRangeSummary(range);
    return summary;
  }

  // Timeseries
  if (widget.type === 'TIMESERIES' && metricKey) {
    const from = cfg['from'] ? new Date(cfg['from'] as string) : (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d; })();
    const to = cfg['to'] ? new Date(cfg['to'] as string) : new Date();
    const currency = cfg['currency'] as string | undefined;
    const channel = cfg['channel'] as string | undefined;
    return metricsService.getMetricTimeseries(metricKey, from, to, currency, channel);
  }

  // Top products (TABLE or BAR widget)
  if (metricKey === 'top_products') {
    const from = cfg['from'] ? new Date(cfg['from'] as string) : (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d; })();
    const to = cfg['to'] ? new Date(cfg['to'] as string) : new Date();
    const limit = typeof cfg['limit'] === 'number' ? cfg['limit'] : 10;
    return metricsService.getTopProductsService(from, to, limit);
  }

  // Fallback: live summary
  return metricsService.getLiveSummary();
}

