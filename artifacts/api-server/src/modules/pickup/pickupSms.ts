import { Prisma } from '@prisma/client';
import prisma from '../../lib/prisma';
import { config } from '../../config';
import { normalizePhone } from '../../lib/phone';
import { sendSms } from '../../lib/telnyx';
import { logger } from '../../utils/logger';
import { finalizedDeliveryStatus, verifyTelnyxSignature } from './pickupSms.contract';

/** Bump when the consent copy or legal meaning of the checkbox changes. */
export const PICKUP_SMS_CONSENT_VERSION = 'pickup-transactional-v1';
const PICKUP_CHANNELS = ['kiosk', 'remote_pickup', 'event_qr'];
const STOP_WORDS = new Set(['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT', 'ARRET']);

type DbTransaction = Prisma.TransactionClient;
type PickupSmsEvent = 'confirmation' | 'ready';

function orderNumber(order: { id: string; kioskOrderNumber: string | null }): string {
  return order.kioskOrderNumber
    ?? `ORD-${order.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

function bodyFor(eventType: PickupSmsEvent, order: { id: string; kioskOrderNumber: string | null }): string {
  const number = orderNumber(order);
  if (eventType === 'confirmation') {
    return `The Jiggling Pig: pickup order ${number} is confirmed and paid. We'll text again when it's ready. Reply STOP to opt out.`;
  }
  return `The Jiggling Pig: pickup order ${number} is ready for pickup! Reply STOP to opt out.`;
}

/**
 * Enqueues one lifecycle event inside the caller's transaction. The caller
 * must invoke this only after a provider-confirmed capture or the actual
 * staff ready_to_ship transition; the payment/status predicates below are a
 * second safety boundary against accidental sends.
 */
export async function enqueuePickupSmsEventTx(
  tx: DbTransaction,
  orderId: string,
  eventType: PickupSmsEvent,
): Promise<{ queued: boolean; reason?: string }> {
  if (!config.pickupSms?.enabled || config.env !== 'production') {
    return { queued: false, reason: 'feature_off' };
  }
  const order = await tx.shopOrder.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderType: true,
      kioskOrderNumber: true,
      orderStatus: { select: { status: true } },
      payments: { where: { status: { in: ['captured', 'partially_refunded'] } }, select: { id: true }, take: 1 },
      pickupSmsConsent: {
        select: {
          phoneNumber: true,
          optedIn: true,
          consentVersion: true,
          consentCapturedAt: true,
        },
      },
    },
  });
  if (!order || !PICKUP_CHANNELS.includes(order.orderType)) return { queued: false, reason: 'not_pickup' };
  if (order.payments.length === 0) return { queued: false, reason: 'not_paid' };
  if (eventType === 'ready' && order.orderStatus.status !== 'ready_to_ship') {
    return { queued: false, reason: 'not_ready' };
  }
  if (eventType === 'confirmation' && ['ready_to_ship', 'delivered', 'cancelled', 'canceled'].includes(order.orderStatus.status)) {
    return { queued: false, reason: 'stale_confirmation' };
  }
  const consent = order.pickupSmsConsent;
  if (!consent?.optedIn || !consent.phoneNumber) return { queued: false, reason: 'not_opted_in' };
  const phone = normalizePhone(consent.phoneNumber) ?? consent.phoneNumber;
  const suppressed = await tx.pickupSmsSuppression.findUnique({ where: { phoneNumber: phone }, select: { id: true } });
  if (suppressed) return { queued: false, reason: 'suppressed' };

  // createMany(skipDuplicates) avoids turning a concurrent duplicate into a
  // PostgreSQL transaction-abort. The unique (orderId,eventType) key is the
  // idempotency boundary for payment/webhook/staff retries.
  const created = await tx.pickupSmsOutbox.createMany({
    data: {
      orderId,
      eventType,
      phoneNumber: phone,
      messageBody: bodyFor(eventType, order),
      consentVersion: consent.consentVersion,
      consentCapturedAt: consent.consentCapturedAt,
    },
    skipDuplicates: true,
  });
  return created.count === 1
    ? { queued: true }
    : { queued: false, reason: 'duplicate' };
}

export async function enqueuePickupSmsEvent(orderId: string, eventType: PickupSmsEvent) {
  return prisma.$transaction((tx) => enqueuePickupSmsEventTx(tx, orderId, eventType));
}

/**
 * Records STOP at the phone level and suppresses all not-yet-dispatched
 * outbox rows in one transaction. In-flight/uncertain rows are not rewritten:
 * the provider may already have accepted those messages.
 */
export async function suppressPickupSms(
  phoneInput: string,
  source = 'inbound_stop',
  reason = 'STOP',
): Promise<{ normalizedPhone: string; suppressedRows: number }> {
  const phone = normalizePhone(phoneInput);
  if (!phone) throw new Error('Cannot suppress an invalid phone number');
  return prisma.$transaction(async (tx) => {
    const result = await suppressPickupSmsTx(tx, phone, source, reason);
    return { normalizedPhone: phone, suppressedRows: result.count };
  });
}

async function suppressPickupSmsTx(
  tx: DbTransaction,
  phone: string,
  source: string,
  reason: string,
) {
  await tx.pickupSmsSuppression.upsert({
    where: { phoneNumber: phone },
    create: { phoneNumber: phone, source, reason },
    update: { source, reason, suppressedAt: new Date() },
  });
  return tx.pickupSmsOutbox.updateMany({
    where: { phoneNumber: phone, status: 'queued' },
    data: { status: 'suppressed', lastError: 'Suppressed by inbound STOP' },
  });
}

export interface PickupSmsDeliveryWebhookInput {
  rawBody: Buffer;
  signature: string;
  timestamp: string;
}

/** Telnyx signs `${timestamp}.${rawBody}` with Ed25519. */
export function verifyTelnyxPickupSmsWebhook(input: PickupSmsDeliveryWebhookInput): boolean {
  return verifyTelnyxSignature(
    input.rawBody,
    input.timestamp,
    input.signature,
    config.telnyx.publicKey,
  );
}

/**
 * Shared webhook counterpart for a future route/worker. It handles inbound
 * STOP and provider delivery status, but deliberately does not send an app
 * generated HELP response: Telnyx messaging profiles own standard STOP/HELP.
 */
export async function handlePickupSmsWebhook(
  input: PickupSmsDeliveryWebhookInput,
): Promise<{ action: 'suppressed' | 'help_ignored' | 'delivery_updated' | 'ignored'; count?: number }> {
  if (!verifyTelnyxPickupSmsWebhook(input)) throw new Error('Invalid Telnyx webhook signature');
  const event = JSON.parse(input.rawBody.toString('utf8')) as {
    data?: {
      event_type?: string;
      id?: string;
      payload?: {
        id?: string;
        from?: { phone_number?: string };
        text?: string;
        to?: Array<{ phone_number?: string }>;
        direction?: string;
        errors?: Array<{ detail?: string }>;
      };
    };
  };
  const payload = event.data?.payload ?? {};
  const eventType = event.data?.event_type;
  const providerEventId = event.data?.id;
  // Telnyx data.id is the webhook event id, not a message id. Never use it as
  // an outbound correlation fallback.
  if (!providerEventId || !eventType) return { action: 'ignored' };
  const providerMessageId = payload.id ?? null;
  const minimalPayload = JSON.stringify({
    event_type: eventType,
    payload: {
      id: providerMessageId,
      from: payload.from?.phone_number ?? null,
      to: payload.to?.map((entry) => ({
        phone_number: entry.phone_number ?? null,
        status: (entry as { status?: string }).status ?? null,
      })) ?? null,
      text: eventType === 'message.received' ? (payload.text ?? '').trim().toUpperCase().slice(0, 16) : undefined,
      direction: payload.direction ?? undefined,
      errors: payload.errors?.map((error) => ({ detail: error.detail ?? 'provider error' })).slice(0, 2) ?? [],
    },
  });

  return prisma.$transaction(async (tx) => {
    const inserted = await tx.pickupSmsWebhookEvent.createMany({
      data: {
        providerEventId,
        eventType,
        providerMessageId,
        payloadJson: minimalPayload,
      },
      skipDuplicates: true,
    });
    if (inserted.count !== 1) return { action: 'ignored' as const };

    if (eventType === 'message.received') {
      // Only accept STOP from a message addressed to this configured sender.
      // This prevents a random inbound webhook from suppressing a customer.
      const sender = normalizePhone(config.telnyx.fromNumber);
      const addressedToSender = Boolean(sender && payload.to?.some((entry) => normalizePhone(entry.phone_number) === sender));
      const text = (payload.text ?? '').trim().toUpperCase();
      const from = normalizePhone(payload.from?.phone_number);
      if (addressedToSender && from && STOP_WORDS.has(text)) {
        await suppressPickupSmsTx(tx, from, 'inbound_stop', text);
        await tx.pickupSmsWebhookEvent.update({
          where: { providerEventId },
          data: { processedAt: new Date(), processingResult: 'suppressed' },
        });
        return { action: 'suppressed' as const };
      }
      await tx.pickupSmsWebhookEvent.update({
        where: { providerEventId },
        data: { processedAt: new Date(), processingResult: text === 'HELP' ? 'help_ignored' : 'ignored' },
      });
      return { action: text === 'HELP' ? 'help_ignored' as const : 'ignored' as const };
    }

    const count = await applyDeliveryEventTx(tx, providerMessageId, eventType, payload);
    if (count > 0) {
      await tx.pickupSmsWebhookEvent.update({
        where: { providerEventId },
        data: { processedAt: new Date(), processingResult: 'delivery_updated' },
      });
    } else {
      // Keep this event replayable: the provider can win the race and deliver
      // before our send response persists its message id.
      await tx.pickupSmsWebhookEvent.update({
        where: { providerEventId },
        data: { processingResult: 'unmatched' },
      });
    }
    return { action: 'delivery_updated' as const, count };
  });
}

type DeliveryPayload = {
  id?: string;
  to?: Array<{ phone_number?: string | null; status?: string | null }> | null;
  errors?: Array<{ detail?: string }>;
};

async function applyDeliveryEventTx(
  tx: DbTransaction,
  providerMessageId: string | null,
  eventType: string,
  payload: DeliveryPayload,
) {
  if (!providerMessageId) return 0;
  const statuses = payload.to?.map((entry) => entry.status).filter((status): status is string => Boolean(status)) ?? [];
  const outcome = finalizedDeliveryStatus({
    eventType,
    statuses,
    hasErrors: (payload.errors?.length ?? 0) > 0,
  });
  if (outcome === 'delivered') {
    return (await tx.pickupSmsOutbox.updateMany({
      where: { providerMessageId, status: { notIn: ['delivered', 'failed', 'suppressed'] } },
      data: { status: 'delivered', sentAt: new Date(), deliveredAt: new Date(), lastError: null },
    })).count;
  }
  if (outcome === 'sent') {
    return (await tx.pickupSmsOutbox.updateMany({
      where: { providerMessageId, status: { notIn: ['delivered', 'failed', 'suppressed'] } },
      data: { status: 'sent', sentAt: new Date(), lastError: null },
    })).count;
  }
  if (outcome === 'delivery_failed') {
    return (await tx.pickupSmsOutbox.updateMany({
      where: { providerMessageId, status: { notIn: ['delivered', 'suppressed'] } },
      data: { status: 'failed', lastError: payload.errors?.[0]?.detail ?? `Telnyx ${eventType}` },
    })).count;
  }
  return 0;
}

/** Replays finalized events that arrived before the provider id was persisted. */
export async function replayPickupSmsDeliveryEvents(providerMessageId: string): Promise<number> {
  const events = await prisma.pickupSmsWebhookEvent.findMany({
    where: { providerMessageId, processedAt: null },
    select: { id: true, eventType: true, payloadJson: true },
  });
  let updated = 0;
  for (const event of events) {
    const stored = JSON.parse(event.payloadJson) as { event_type?: string; payload?: DeliveryPayload };
    const payload = stored.payload ?? {};
    updated += await prisma.$transaction(async (tx) => {
      const count = await applyDeliveryEventTx(tx, providerMessageId, stored.event_type ?? event.eventType, payload);
      await tx.pickupSmsWebhookEvent.update({
        where: { id: event.id },
        data: { processedAt: new Date(), processingResult: count > 0 ? 'delivery_updated' : 'ignored' },
      });
      return count;
    });
  }
  return updated;
}

async function markSuppressed(id: string, reason: string) {
  await prisma.pickupSmsOutbox.updateMany({ where: { id, status: { in: ['sending', 'queued'] } }, data: { status: 'suppressed', lastError: reason } });
}

let workerRunning = false;

async function processPickupSmsOutboxOnce(limit = 20): Promise<number> {
  if (!config.pickupSms.enabled || config.env !== 'production') return 0;
  // A process crash after the provider accepted a request but before the
  // local update is indistinguishable from an uncertain response. Quarantine
  // stale claims rather than sending them again.
  await prisma.pickupSmsOutbox.updateMany({
    where: {
      status: 'sending',
      claimedAt: { lt: new Date(Date.now() - 5 * 60_000) },
    },
    data: { status: 'uncertain', uncertainAt: new Date(), lastError: 'Worker claim expired; awaiting provider webhook' },
  });
  const rows = await prisma.pickupSmsOutbox.findMany({
    where: { status: 'queued', OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: new Date() } }] },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });
  let processed = 0;
  for (const row of rows) {
    const claimed = await prisma.pickupSmsOutbox.updateMany({
      where: { id: row.id, status: 'queued' },
      data: { status: 'sending', attemptCount: { increment: 1 }, claimedAt: new Date() },
    });
    if (claimed.count !== 1) continue;
    const current = await prisma.pickupSmsOutbox.findUnique({
      where: { id: row.id },
      include: { order: { include: { payments: true, orderStatus: true }, }, },
    });
    if (!current || !current.order.payments.some((payment) => ['captured', 'partially_refunded'].includes(payment.status))) {
      await markSuppressed(row.id, 'Payment is no longer captured');
      continue;
    }
    const status = current.order.orderStatus.status;
    if (
      (row.eventType === 'ready' && status !== 'ready_to_ship')
      || (row.eventType === 'confirmation' && ['ready_to_ship', 'delivered', 'cancelled', 'canceled'].includes(status))
    ) {
      await markSuppressed(row.id, `Stale pickup ${row.eventType} event at status ${status}`);
      continue;
    }
    const suppression = await prisma.pickupSmsSuppression.findUnique({ where: { phoneNumber: row.phoneNumber }, select: { id: true } });
    const consent = await prisma.pickupSmsConsent.findUnique({ where: { orderId: row.orderId }, select: { optedIn: true } });
    if (suppression || !consent?.optedIn) {
      await markSuppressed(row.id, suppression ? 'Suppressed by phone' : 'Consent is not active');
      continue;
    }
    const result = await sendSms(row.phoneNumber, row.messageBody);
    if (result.success) {
      await prisma.pickupSmsOutbox.update({ where: { id: row.id }, data: { status: 'sent', providerMessageId: result.messageId, sentAt: new Date(), lastError: null } });
      if (result.messageId) await replayPickupSmsDeliveryEvents(result.messageId);
    } else if (result.uncertain) {
      await prisma.pickupSmsOutbox.update({ where: { id: row.id }, data: { status: 'uncertain', uncertainAt: new Date(), lastError: result.error } });
      logger.warn('pickupSms: provider response uncertain; quarantined without retry', { outboxId: row.id });
    } else if (result.retryable && current.attemptCount < 3) {
      await prisma.pickupSmsOutbox.update({
        where: { id: row.id },
        data: {
          status: 'queued',
          nextAttemptAt: new Date(Date.now() + (result.retryAfterMs ?? 5_000)),
          lastError: result.error,
        },
      });
      logger.info('pickupSms: retrying provider rate limit', { outboxId: row.id, attempt: current.attemptCount });
    } else if (result.error === 'SMS_SUPPRESSED') {
      await markSuppressed(row.id, 'Suppressed by phone');
    } else {
      await prisma.pickupSmsOutbox.update({ where: { id: row.id }, data: { status: 'failed', lastError: result.error } });
    }
    processed += 1;
  }
  return processed;
}

export async function processPickupSmsOutbox(limit = 20): Promise<number> {
  if (workerRunning) return 0;
  workerRunning = true;
  try {
    return await processPickupSmsOutboxOnce(limit);
  } finally {
    workerRunning = false;
  }
}

let workerTimer: ReturnType<typeof setInterval> | undefined;
export function startPickupSmsOutboxWorker() {
  if (workerTimer || !config.pickupSms.enabled || config.env !== 'production') return;
  workerTimer = setInterval(() => {
    processPickupSmsOutbox().catch((error) => logger.error('pickupSms worker failed', { error }));
  }, 5_000);
  void processPickupSmsOutbox().catch((error) => logger.error('pickupSms worker initial run failed', { error }));
}
export function stopPickupSmsOutboxWorker() {
  if (workerTimer) clearInterval(workerTimer);
  workerTimer = undefined;
}