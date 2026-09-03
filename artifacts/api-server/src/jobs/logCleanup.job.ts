import prisma from '../lib/prisma';
import { config } from '../config';
import { logger } from '../utils/logger';

/**
 * Repeatable job — runs daily at 3 AM.
 * Purges records older than LOG_RETENTION_DAYS:
 *   - MessageDeliveryLog (FK child — must be deleted before parent outbox rows)
 *   - MessageOutbox
 *   - AuditLog
 *   - Read UserNotifications
 */
export async function logCleanupProcessor(): Promise<void> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - config.jobs.logRetentionDays);

  // ── Step 1: Delete delivery logs for old outbox messages (FK constraint) ──
  const oldOutboxes = await prisma.messageOutbox.findMany({
    where: { createdAt: { lt: cutoff } },
    select: { id: true },
  });

  let deliveryLogsDeleted = 0;
  let outboxDeleted = 0;

  if (oldOutboxes.length > 0) {
    const ids = oldOutboxes.map((o) => o.id);

    const dlResult = await prisma.messageDeliveryLog.deleteMany({
      where: { outboxId: { in: ids } },
    });
    deliveryLogsDeleted = dlResult.count;

    const obResult = await prisma.messageOutbox.deleteMany({
      where: { id: { in: ids } },
    });
    outboxDeleted = obResult.count;
  }

  // ── Step 2: Purge old audit logs ─────────────────────────────────────────
  const auditResult = await prisma.auditLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });

  // ── Step 3: Purge old read in-app notifications ──────────────────────────
  const notifResult = await prisma.userNotification.deleteMany({
    where: { createdAt: { lt: cutoff }, isRead: true },
  });

  logger.info('logCleanup: completed', {
    cutoffDate: cutoff.toISOString(),
    deliveryLogsDeleted,
    outboxDeleted,
    auditLogsDeleted: auditResult.count,
    notificationsDeleted: notifResult.count,
  });
}

