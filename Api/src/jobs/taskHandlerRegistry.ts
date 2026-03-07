import { autoCancelSweeper } from './scheduler';
import { lowStockCheckProcessor } from './lowStockCheck.job';
import { logCleanupProcessor } from './logCleanup.job';
import { dailySalesSummaryProcessor } from './dailySalesSummary.job';
import { aggregateMetricsProcessor } from './aggregateMetrics.job';

export interface TaskHandlerMeta {
  key: string;
  name: string;
  description: string;
  category: string;
  defaultCron: string;
  handler: () => Promise<void>;
}

const registry = new Map<string, TaskHandlerMeta>();

function register(meta: TaskHandlerMeta): void {
  registry.set(meta.key, meta);
}

register({
  key: 'autoCancelSweeper',
  name: 'Auto-Cancel Stale Orders',
  description: 'Cancels pending orders older than the configured threshold with no authorized/captured payment.',
  category: 'orders',
  defaultCron: '*/5 * * * *',
  handler: autoCancelSweeper,
});

register({
  key: 'lowStockCheck',
  name: 'Low Stock Check',
  description: 'Finds product items at or below the low-stock threshold and notifies admins. Optionally auto-disables out-of-stock items.',
  category: 'inventory',
  defaultCron: '0 * * * *',
  handler: lowStockCheckProcessor,
});

register({
  key: 'logCleanup',
  name: 'Log & Notification Cleanup',
  description: 'Purges old delivery logs, outbox messages, audit logs, and read notifications beyond retention period.',
  category: 'maintenance',
  defaultCron: '0 3 * * *',
  handler: logCleanupProcessor,
});

register({
  key: 'dailySalesSummary',
  name: 'Daily Sales Summary',
  description: 'Aggregates previous day orders and sends a summary notification to all active admins.',
  category: 'reports',
  defaultCron: '0 6 * * *',
  handler: dailySalesSummaryProcessor,
});

register({
  key: 'aggregateMetrics',
  name: 'Aggregate Daily Metrics',
  description: 'Computes previous day key metrics from transactional tables and upserts into MetricDaily.',
  category: 'reports',
  defaultCron: '0 1 * * *',
  handler: aggregateMetricsProcessor,
});

export function getHandler(taskKey: string): TaskHandlerMeta | undefined {
  return registry.get(taskKey);
}

export function getAllHandlers(): TaskHandlerMeta[] {
  return Array.from(registry.values());
}

export function getHandlerKeys(): string[] {
  return Array.from(registry.keys());
}
