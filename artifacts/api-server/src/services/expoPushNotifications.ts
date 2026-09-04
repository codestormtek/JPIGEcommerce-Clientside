import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { logger } from '../utils/logger';

export type StaffPushEventType = 'kiosk_order_captured' | 'kiosk_order_ready';
const MAX_ATTEMPTS = 6;
const LEASE_MS = 60_000;
const RECEIPT_DELAY_MS = 20_000;
let worker: NodeJS.Timeout | undefined;

const eventConfig: Record<StaffPushEventType, { audience: 'kitchen' | 'cashier'; title: string }> = {
  kiosk_order_captured: { audience: 'kitchen', title: 'New kiosk order' },
  kiosk_order_ready: { audience: 'cashier', title: 'Order ready' },
};

const retryAt = (attempt: number) => new Date(Date.now() + Math.min(15 * 60_000, 5_000 * 2 ** Math.min(attempt, 7)));
const expoHeaders = () => ({
  Accept: 'application/json',
  'Content-Type': 'application/json',
  ...(process.env.EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` } : {}),
});

/** Inserts/wakes the durable outbox only. Network delivery belongs to the worker. */
export async function enqueueStaffOrderPush(orderId: string, eventType: StaffPushEventType): Promise<void> {
  const audience = eventConfig[eventType].audience;
  try {
    await prisma.pushNotificationEvent.create({ data: { orderId, eventType, audience } });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error;
    // A duplicate must repair retryable/stale work, but never steal a live lease.
    await prisma.pushNotificationEvent.updateMany({
      where: {
        orderId, eventType,
        OR: [
          { status: 'failed', completedAt: null },
          { status: 'sending', leaseExpiresAt: { lt: new Date() } },
        ],
      },
      data: { status: 'pending', nextAttemptAt: new Date(), leaseExpiresAt: null },
    });
  }
}

async function disableTokens(tokens: string[]) {
  if (tokens.length) await prisma.expoPushToken.updateMany({ where: { token: { in: tokens } }, data: { enabled: false } });
}

async function refreshEvent(eventId: string) {
  const deliveries = await prisma.pushNotificationDelivery.findMany({
    where: { eventId }, select: { status: true, nextAttemptAt: true, lastError: true },
  });
  if (!deliveries.length) {
    await prisma.pushNotificationEvent.updateMany({
      where: { id: eventId, status: { notIn: ['sent', 'failed'] } },
      data: { status: 'sent', sentAt: new Date(), completedAt: new Date(), leaseExpiresAt: null, lastError: null },
    });
    return;
  }
  const incomplete = deliveries.filter((d) => ['pending', 'sending', 'receipt_pending'].includes(d.status));
  if (!incomplete.length) {
    const permanentFailure = deliveries.find((d) => d.status === 'failed');
    await prisma.pushNotificationEvent.update({
      where: { id: eventId },
      data: permanentFailure
        ? { status: 'failed', completedAt: new Date(), leaseExpiresAt: null, lastError: permanentFailure.lastError }
        : { status: 'sent', sentAt: new Date(), completedAt: new Date(), leaseExpiresAt: null, lastError: null },
    });
    return;
  }
  const next = incomplete.reduce((earliest, delivery) =>
    delivery.nextAttemptAt < earliest ? delivery.nextAttemptAt : earliest, incomplete[0].nextAttemptAt);
  await prisma.pushNotificationEvent.update({
    where: { id: eventId },
    data: {
      status: incomplete.some((d) => d.status === 'receipt_pending') ? 'awaiting_receipts' : 'pending',
      nextAttemptAt: next,
      leaseExpiresAt: null,
    },
  });
}

async function claimEvent(): Promise<string | null> {
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const event = await tx.pushNotificationEvent.findFirst({
      where: {
        OR: [
          { status: { in: ['pending', 'failed'] }, completedAt: null, nextAttemptAt: { lte: now } },
          { status: 'sending', leaseExpiresAt: { lt: now } },
        ],
      },
      orderBy: { nextAttemptAt: 'asc' },
      select: { id: true },
    });
    if (!event) return null;
    const claimed = await tx.pushNotificationEvent.updateMany({
      where: {
        id: event.id,
        OR: [
          { status: { in: ['pending', 'failed'] }, completedAt: null, nextAttemptAt: { lte: now } },
          { status: 'sending', leaseExpiresAt: { lt: now } },
        ],
      },
      data: { status: 'sending', claimedAt: now, leaseExpiresAt: new Date(now.getTime() + LEASE_MS), attemptCount: { increment: 1 } },
    });
    return claimed.count ? event.id : null;
  });
}

async function claimDeliveries(eventId: string) {
  const now = new Date();
  const candidates = await prisma.pushNotificationDelivery.findMany({
    where: {
      eventId,
      OR: [
        { status: { in: ['pending', 'sending'] }, nextAttemptAt: { lte: now } },
        { status: 'sending', leaseExpiresAt: { lt: now } },
      ],
    },
    orderBy: { nextAttemptAt: 'asc' },
    take: 100,
    select: { id: true, token: true },
  });
  if (!candidates.length) return [];
  const ids = candidates.map((item) => item.id);
  await prisma.pushNotificationDelivery.updateMany({
    where: { id: { in: ids }, OR: [{ status: { in: ['pending', 'sending'] }, nextAttemptAt: { lte: now } }, { status: 'sending', leaseExpiresAt: { lt: now } }] },
    data: { status: 'sending', leaseExpiresAt: new Date(now.getTime() + LEASE_MS), attemptCount: { increment: 1 } },
  });
  return prisma.pushNotificationDelivery.findMany({ where: { id: { in: ids }, status: 'sending' }, select: { id: true, token: true, attemptCount: true } });
}

async function deliverEvent(eventId: string) {
  const event = await prisma.pushNotificationEvent.findUnique({
    where: { id: eventId },
    include: { order: { select: { id: true, kioskOrderNumber: true, lines: { select: { qty: true } } } } },
  });
  if (!event) return;
  let existing = await prisma.pushNotificationDelivery.count({ where: { eventId } });
  if (!existing) {
    const tokens = await prisma.expoPushToken.findMany({
      where: { enabled: true, rolePreference: { in: [event.audience, 'both'] }, user: { role: 'admin', isActive: true, isDeleted: false } },
      select: { token: true },
    });
    if (tokens.length) {
      await prisma.pushNotificationDelivery.createMany({ data: tokens.map(({ token }) => ({ eventId, token })), skipDuplicates: true });
    }
    existing = tokens.length;
  }
  if (!existing) return refreshEvent(eventId);
  const deliveries = await claimDeliveries(eventId);
  if (!deliveries.length) return refreshEvent(eventId);
  const itemCount = event.order.lines.reduce((total, line) => total + line.qty, 0);
  const orderNumber = event.order.kioskOrderNumber ?? `ORD-${event.order.id.slice(0, 8).toUpperCase()}`;
  const body = `${orderNumber} · ${itemCount} item${itemCount === 1 ? '' : 's'}`;
  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST', headers: expoHeaders(),
      body: JSON.stringify(deliveries.map((delivery) => ({
        to: delivery.token, sound: 'default', title: eventConfig[event.eventType as StaffPushEventType].title, body,
        data: { orderId: event.orderId, eventType: event.eventType },
      }))),
    });
    if (!response.ok) throw new Error(`Expo Push API returned ${response.status}`);
    const payload = await response.json() as { data?: Array<{ status?: string; id?: string; details?: { error?: string } }> };
    if (!payload.data || payload.data.length !== deliveries.length) throw new Error('Expo Push API returned an incomplete ticket response');
    const now = new Date();
    await Promise.all(deliveries.map((delivery, index) => {
      const ticket = payload.data![index];
      const error = ticket.details?.error;
      if (ticket.status === 'ok' && ticket.id) {
        return prisma.pushNotificationDelivery.update({ where: { id: delivery.id }, data: { status: 'receipt_pending', ticketId: ticket.id, sentAt: now, leaseExpiresAt: null, nextAttemptAt: new Date(now.getTime() + RECEIPT_DELAY_MS), lastError: null } });
      }
      if (error === 'DeviceNotRegistered') {
        return prisma.pushNotificationDelivery.update({ where: { id: delivery.id }, data: { status: 'disabled', completedAt: now, leaseExpiresAt: null, lastError: error } });
      }
      const terminal = delivery.attemptCount >= MAX_ATTEMPTS || ['MessageTooBig', 'InvalidCredentials'].includes(error ?? '');
      return prisma.pushNotificationDelivery.update({ where: { id: delivery.id }, data: terminal
        ? { status: 'failed', completedAt: now, leaseExpiresAt: null, lastError: error ?? 'Expo ticket rejected' }
        : { status: 'pending', leaseExpiresAt: null, nextAttemptAt: retryAt(delivery.attemptCount), lastError: error ?? 'Expo ticket rejected' } });
    }));
    await disableTokens(deliveries.filter((_, index) => payload.data![index].details?.error === 'DeviceNotRegistered').map((delivery) => delivery.token));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const now = new Date();
    await Promise.all(deliveries.map((delivery) => prisma.pushNotificationDelivery.updateMany({
      where: { id: delivery.id, status: 'sending' },
      data: delivery.attemptCount >= MAX_ATTEMPTS
        ? { status: 'failed', completedAt: now, leaseExpiresAt: null, lastError: message.slice(0, 1000) }
        : { status: 'pending', leaseExpiresAt: null, nextAttemptAt: retryAt(delivery.attemptCount), lastError: message.slice(0, 1000) },
    })));
  }
  await refreshEvent(eventId);
}

async function pollReceipts() {
  const due = await prisma.pushNotificationDelivery.findMany({
    where: { status: 'receipt_pending', nextAttemptAt: { lte: new Date() }, ticketId: { not: null } },
    take: 100, select: { id: true, eventId: true, token: true, ticketId: true, attemptCount: true },
  });
  if (!due.length) return;
  try {
    const response = await fetch('https://exp.host/--/api/v2/push/getReceipts', {
      method: 'POST', headers: expoHeaders(), body: JSON.stringify({ ids: due.map((delivery) => delivery.ticketId!) }),
    });
    if (!response.ok) throw new Error(`Expo receipts API returned ${response.status}`);
    const payload = await response.json() as { data?: Record<string, { status?: string; details?: { error?: string } }> };
    const now = new Date();
    for (const delivery of due) {
      const receipt = payload.data?.[delivery.ticketId!];
      if (!receipt) {
        // Expo has not produced it yet; poll with the same bounded backoff.
        await prisma.pushNotificationDelivery.update({
          where: { id: delivery.id },
          data: delivery.attemptCount >= MAX_ATTEMPTS
            ? { status: 'failed', completedAt: now, lastError: 'Expo receipt was not available before retry limit' }
            : { attemptCount: { increment: 1 }, nextAttemptAt: retryAt(delivery.attemptCount) },
        });
        continue;
      }
      const error = receipt.details?.error;
      if (receipt.status === 'ok') {
        await prisma.pushNotificationDelivery.update({ where: { id: delivery.id }, data: { status: 'sent', completedAt: now, receiptJson: JSON.stringify(receipt), lastError: null } });
      } else if (error === 'DeviceNotRegistered') {
        await prisma.pushNotificationDelivery.update({ where: { id: delivery.id }, data: { status: 'disabled', completedAt: now, receiptJson: JSON.stringify(receipt), lastError: error } });
        await disableTokens([delivery.token]);
      } else {
        const terminal = delivery.attemptCount >= MAX_ATTEMPTS || ['MessageTooBig', 'InvalidCredentials'].includes(error ?? '');
        await prisma.pushNotificationDelivery.update({ where: { id: delivery.id }, data: terminal
          ? { status: 'failed', completedAt: now, receiptJson: JSON.stringify(receipt), lastError: error ?? 'Expo receipt failed' }
          : { status: 'pending', ticketId: null, receiptJson: JSON.stringify(receipt), nextAttemptAt: retryAt(delivery.attemptCount), lastError: error ?? 'Expo receipt failed' } });
      }
    }
    await Promise.all([...new Set(due.map((delivery) => delivery.eventId))].map(refreshEvent));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await Promise.all(due.map((delivery) => prisma.pushNotificationDelivery.updateMany({
      where: { id: delivery.id, status: 'receipt_pending' },
      data: delivery.attemptCount >= MAX_ATTEMPTS
        ? { status: 'failed', completedAt: new Date(), lastError: message.slice(0, 1000) }
        : { attemptCount: { increment: 1 }, nextAttemptAt: retryAt(delivery.attemptCount), lastError: message.slice(0, 1000) },
    })));
    await Promise.all([...new Set(due.map((delivery) => delivery.eventId))].map(refreshEvent));
  }
}

async function reconcileMissingEvents() {
  const captured = await prisma.shopOrder.findMany({
    where: { orderType: 'kiosk', payments: { some: { status: { in: ['captured', 'partially_refunded'] } } }, pushNotificationEvents: { none: { eventType: 'kiosk_order_captured' } } },
    take: 25, select: { id: true },
  });
  const ready = await prisma.shopOrder.findMany({
    where: { orderType: 'kiosk', orderStatus: { status: 'ready_to_ship' }, payments: { some: { status: { in: ['captured', 'partially_refunded'] } } }, pushNotificationEvents: { none: { eventType: 'kiosk_order_ready' } } },
    take: 25, select: { id: true },
  });
  await Promise.all([
    ...captured.map((order) => enqueueStaffOrderPush(order.id, 'kiosk_order_captured')),
    ...ready.map((order) => enqueueStaffOrderPush(order.id, 'kiosk_order_ready')),
  ]);
}

export async function runExpoPushOutboxOnce(): Promise<void> {
  try {
    await reconcileMissingEvents();
    await pollReceipts();
    for (let index = 0; index < 5; index += 1) {
      const eventId = await claimEvent();
      if (!eventId) break;
      await deliverEvent(eventId);
    }
  } catch (error) {
    logger.warn('Expo push outbox worker iteration failed', { error });
  }
}

export function startExpoPushOutboxWorker(): () => void {
  if (worker) return () => stopExpoPushOutboxWorker();
  worker = setInterval(() => { void runExpoPushOutboxOnce(); }, 5_000);
  worker.unref();
  void runExpoPushOutboxOnce();
  logger.info('Expo push outbox worker started');
  return stopExpoPushOutboxWorker;
}

export function stopExpoPushOutboxWorker(): void {
  if (worker) clearInterval(worker);
  worker = undefined;
}