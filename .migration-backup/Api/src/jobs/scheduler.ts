/**
 * scheduler.ts — node-cron based job scheduler.
 *
 * All recurring jobs run inside the API process (no Redis, no separate worker).
 * Start by calling startScheduler() from server.ts after the DB connects.
 */

import cron from 'node-cron';
import prisma from '../lib/prisma';
import { logger } from '../utils/logger';
import { AuditAction, logAudit } from '../utils/auditLogger';
import { lowStockCheckProcessor } from './lowStockCheck.job';
import { logCleanupProcessor } from './logCleanup.job';
import { dailySalesSummaryProcessor } from './dailySalesSummary.job';
import { aggregateMetricsProcessor } from './aggregateMetrics.job';
import { pollAndRunDueTasks, seedScheduledTasks } from './taskRunner';

// ─── Auto-cancel sweeper ──────────────────────────────────────────────────────

const AUTO_CANCEL_THRESHOLD_MS = parseInt(
  process.env.AUTO_CANCEL_ORDER_DELAY_MS ?? String(30 * 60 * 1000),
  10,
);

/**
 * Cancels any pending orders older than AUTO_CANCEL_THRESHOLD_MS that have no
 * authorized or captured payment. Runs every 5 minutes via cron.
 */
export async function autoCancelSweeper(): Promise<void> {
  const cutoff = new Date(Date.now() - AUTO_CANCEL_THRESHOLD_MS);

  const cancelledStatus = await prisma.orderStatus.findFirst({
    where: { status: 'cancelled' },
  });
  if (!cancelledStatus) {
    logger.warn('autoCancelSweeper: "cancelled" order status not found — skipping');
    return;
  }

  const staleOrders = await prisma.shopOrder.findMany({
    where: {
      orderDate: { lt: cutoff },
      orderStatus: { status: 'pending' },
      payments: {
        none: { status: { in: ['authorized', 'captured'] } },
      },
    },
    select: { id: true, orderStatusId: true },
  });

  if (staleOrders.length === 0) return;

  logger.info(`autoCancelSweeper: cancelling ${staleOrders.length} stale order(s)`);

  for (const order of staleOrders) {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            oldStatusId: order.orderStatusId,
            newStatusId: cancelledStatus.id,
            changedAt: new Date(),
            changedByUserId: null,
          },
        });
        await tx.shopOrder.update({
          where: { id: order.id },
          data: { orderStatusId: cancelledStatus.id },
        });
      });

      logAudit({
        action: AuditAction.ORDER_AUTO_CANCELLED,
        entityType: 'Order',
        entityId: order.id,
      });

      logger.info(`autoCancelSweeper: cancelled order ${order.id}`);
    } catch (err) {
      logger.error(`autoCancelSweeper: failed to cancel order ${order.id}`, { err });
    }
  }
}

// ─── Safe wrapper ─────────────────────────────────────────────────────────────

function safe(name: string, fn: () => Promise<void>): () => void {
  return () => {
    fn().catch((err: unknown) => logger.error(`${name}: unhandled error`, { err }));
  };
}

// ─── Scheduler entry point ────────────────────────────────────────────────────

export function startScheduler(): void {
  // Every 5 min — cancel stale pending orders
  cron.schedule('*/5 * * * *', safe('autoCancelSweeper', autoCancelSweeper));

  // Every hour — low stock check and admin notifications
  cron.schedule('0 * * * *', safe('lowStockCheck', lowStockCheckProcessor));

  // Daily at 03:00 — purge old logs and notifications
  cron.schedule('0 3 * * *', safe('logCleanup', logCleanupProcessor));

  // Daily at 06:00 — daily sales summary notification to admins
  cron.schedule('0 6 * * *', safe('dailySalesSummary', dailySalesSummaryProcessor));

  // Daily at 01:00 — aggregate yesterday's metrics into MetricDaily
  cron.schedule('0 1 * * *', safe('aggregateMetrics', aggregateMetricsProcessor));

  // Every 60 seconds — poll DB for due scheduled tasks and execute them
  cron.schedule('* * * * *', safe('taskRunner', pollAndRunDueTasks));

  // Seed scheduled tasks on startup
  seedScheduledTasks().catch((err) =>
    logger.error('Failed to seed scheduled tasks', { err }),
  );

  logger.info('Scheduler started: 5 cron jobs + DB-driven task runner registered');
}

