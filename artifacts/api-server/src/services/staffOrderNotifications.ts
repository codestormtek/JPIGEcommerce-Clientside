import prisma from '../lib/prisma';
import { config } from '../config';
import { EmailProviderRejectedError, sendEmail } from '../lib/mailer';
import { sendSms } from '../lib/telnyx';
import { isSmsSuppressed } from '../lib/smsSuppression';
import { logger } from '../utils/logger';
import type { Prisma } from '@prisma/client';
import { normalizePhone } from '../lib/phone';

export type StaffOrderSource = 'kiosk' | 'remote_pickup';
const EVENT = 'payment_captured';
const MAX_ATTEMPTS = 3;
const LEASE_MS = 5 * 60_000;

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]!);
}

function paidOrderNumber(order: { id: string; kioskOrderNumber: string | null }): string {
  return order.kioskOrderNumber
    ?? `ORD-${order.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

function content(input: {
  id: string;
  kioskOrderNumber: string | null;
  grandTotal: unknown;
  currency: string;
  lines: Array<{
    productNameSnapshot: string;
    qty: number;
    sideSelectionsText: string | null;
    lineTotal: unknown;
  }>;
}, source: StaffOrderSource) {
  const orderNumber = paidOrderNumber(input);
  const label = source === 'kiosk' ? 'Paid kiosk order' : 'Paid remote pickup order';
  const count = input.lines.reduce((sum, line) => sum + line.qty, 0);
  const total = `${input.currency} ${Number(input.grandTotal).toFixed(2)}`;
  // The legacy admin currently exposes an order queue, not a stable detail
  // route. Link to that known route rather than inventing a dead deep link.
  const link = `${config.staffOrderNotifications.adminUrl.replace(/\/$/, '')}/orders`;
  const subject = `${label} — ${orderNumber}`;
  // SMS intentionally excludes customer names, phones, email, and item details
  // because staff phones may show this text on a lock screen.
  const smsText = `${label} ${orderNumber}. ${count} item${count === 1 ? '' : 's'}, ${total}. Open ${link}`;
  const emailLines = input.lines.map((line) => {
    const sides = line.sideSelectionsText?.trim() ? ` — Sides: ${line.sideSelectionsText.trim()}` : '';
    return `${line.qty} × ${line.productNameSnapshot}${sides} — ${input.currency} ${Number(line.lineTotal).toFixed(2)}`;
  });
  const emailText = `${label} — ${orderNumber}\n\n${emailLines.join('\n')}\n\nTotal: ${total}\nOpen order queue: ${link}`;
  const lineRows = input.lines.map((line) => {
    const sides = line.sideSelectionsText?.trim()
      ? `<div style="color:#666;font-size:13px">Sides: ${escapeHtml(line.sideSelectionsText.trim())}</div>`
      : '';
    return `<tr><td style="padding:8px;border-bottom:1px solid #eee">${line.qty} × ${escapeHtml(line.productNameSnapshot)}${sides}</td>`
      + `<td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${escapeHtml(input.currency)} ${Number(line.lineTotal).toFixed(2)}</td></tr>`;
  }).join('');
  const bodyHtml = `<!doctype html><html><body style="font-family:Arial,sans-serif">`
    + `<h2>${escapeHtml(label)}</h2><p><strong>${escapeHtml(orderNumber)}</strong></p>`
    + `<table style="width:100%;border-collapse:collapse">${lineRows}</table>`
    + `<p style="text-align:right"><strong>Total: ${escapeHtml(total)}</strong></p>`
    + `<p><a href="${escapeHtml(link)}">Open order in admin</a></p></body></html>`;
  return { orderNumber, subject, smsText, emailText, bodyHtml };
}

function isMissingTable(error: unknown): boolean {
  const candidate = error as { code?: string; message?: string };
  return candidate?.code === 'P2021'
    || /staff_order_deliveries|does not exist/i.test(candidate?.message ?? '');
}

function channelReadiness() {
  const production = config.env === 'production';
  return {
    email: production && config.staffOrderNotifications.emailEnabled
      && Boolean(config.resend.apiKey && config.resend.from && process.env.ADMIN_EMAIL),
    sms: production && config.staffOrderNotifications.smsEnabled
      && config.staffOrderNotifications.smsProviderReady
      && Boolean(config.telnyx.apiKey && config.telnyx.fromNumber && config.telnyx.publicKey),
  };
}

/**
 * Inserts the winning capture's delivery snapshot in the payment transaction.
 * A savepoint makes an absent/new outbox schema a recoverable notification
 * failure instead of poisoning the authoritative payment transaction.
 */
export async function enqueuePaidStaffOrderNotificationsTx(
  tx: Prisma.TransactionClient,
  orderId: string,
  source: StaffOrderSource,
): Promise<boolean> {
  const ready = channelReadiness();
  if (!ready.email && !ready.sms) return false;
  await tx.$executeRawUnsafe('SAVEPOINT staff_order_notification_enqueue');
  try {
    const order = await tx.shopOrder.findUnique({
      where: { id: orderId },
      select: {
        id: true, kioskOrderNumber: true, grandTotal: true, currency: true,
        orderStatus: { select: { status: true } },
        payments: { select: { status: true } },
        lines: {
          select: {
            productNameSnapshot: true, qty: true, sideSelectionsText: true, lineTotal: true,
          },
        },
      },
    });
    if (!order) {
      await tx.$executeRawUnsafe('RELEASE SAVEPOINT staff_order_notification_enqueue');
      return false;
    }
    const isCaptured = order.payments.some((payment) => payment.status === 'captured');
    const isCanceled = ['cancelled', 'canceled'].includes(order.orderStatus.status);
    if (!isCaptured || isCanceled) {
      await tx.$executeRawUnsafe('RELEASE SAVEPOINT staff_order_notification_enqueue');
      return false;
    }
    const message = content(order, source);
    const rows: Array<Record<string, unknown>> = [];
    if (ready.email) {
      rows.push({
        orderId, orderNumber: message.orderNumber, eventType: EVENT, source,
        channel: 'email', recipient: config.store.adminEmail,
        subject: message.subject, bodyHtml: message.bodyHtml, bodyText: message.emailText,
      });
    }
    if (ready.sms) {
      const recipients = await tx.orderNotificationRecipient.findMany({
        where: { isActive: true },
        select: { id: true, phoneNumber: true },
      });
      const seenPhones = new Set<string>();
      for (const recipient of recipients) {
        const phoneNumber = normalizePhone(recipient.phoneNumber);
        if (!phoneNumber || seenPhones.has(phoneNumber)) continue;
        seenPhones.add(phoneNumber);
        rows.push({
          orderId, orderNumber: message.orderNumber, eventType: EVENT, source,
          channel: 'sms', recipient: phoneNumber, recipientId: recipient.id,
          bodyText: message.smsText,
        });
      }
    }
    if (rows.length) {
      await tx.staffOrderDelivery.createMany({ data: rows as any, skipDuplicates: true });
    }
    await tx.$executeRawUnsafe('RELEASE SAVEPOINT staff_order_notification_enqueue');
    return rows.length > 0;
  } catch (error) {
    await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT staff_order_notification_enqueue');
    await tx.$executeRawUnsafe('RELEASE SAVEPOINT staff_order_notification_enqueue');
    logger.warn('Staff paid-order notification enqueue skipped', {
      orderId, source, storageMissing: isMissingTable(error), error,
    });
    return false;
  }
}

async function markUnknown(id: string, reason: string) {
  await prisma.staffOrderDelivery.update({
    where: { id },
    data: { status: 'unknown', unknownAt: new Date(), lastError: reason },
  });
}

async function processOne(id: string): Promise<void> {
  const claimed = await prisma.staffOrderDelivery.updateMany({
    where: { id, status: 'queued' },
    data: { status: 'sending', claimedAt: new Date(), attempts: { increment: 1 } },
  });
  if (claimed.count !== 1) return;
  const row = await prisma.staffOrderDelivery.findUnique({
    where: { id },
    include: { order: { include: { payments: true, orderStatus: true } } },
  });
  if (!row) return;
  const paid = row.order.payments.some((payment) => payment.status === 'captured');
  const closed = ['cancelled', 'canceled'].includes(row.order.orderStatus.status);
  if (!paid || closed) {
    await prisma.staffOrderDelivery.update({
      where: { id },
      data: { status: 'suppressed', lastError: closed ? 'Order was canceled before send' : 'Payment is no longer captured' },
    });
    return;
  }

  if (row.channel === 'sms') {
    const activeRecipients = await prisma.orderNotificationRecipient.findMany({
      where: { isActive: true },
      select: { id: true, phoneNumber: true },
    });
    const normalizedRecipient = normalizePhone(row.recipient);
    const active = activeRecipients.find((candidate) =>
      normalizePhone(candidate.phoneNumber) === normalizedRecipient);
    if (!active || await isSmsSuppressed(row.recipient)) {
      await prisma.staffOrderDelivery.update({
        where: { id }, data: { status: 'suppressed', lastError: active ? 'Suppressed by phone' : 'Recipient is inactive' },
      });
      return;
    }
    const result = await sendSms(row.recipient, row.bodyText);
    if (result.success) {
      await prisma.staffOrderDelivery.update({
        where: { id }, data: { status: 'sent', sentAt: new Date(), providerMessageId: result.messageId, lastError: null },
      });
    } else if (result.uncertain) {
      await markUnknown(id, result.error ?? 'Provider result unknown');
    } else if (result.retryable && row.attempts < MAX_ATTEMPTS) {
      await prisma.staffOrderDelivery.update({
        where: { id },
        data: { status: 'queued', nextAttemptAt: new Date(Date.now() + (result.retryAfterMs ?? 5_000)), lastError: result.error },
      });
    } else {
      await prisma.staffOrderDelivery.update({ where: { id }, data: { status: 'failed', lastError: result.error } });
    }
    return;
  }

  try {
    const providerMessageId = await sendEmail({
      to: row.recipient,
      subject: row.subject ?? `Paid order ${row.orderNumber}`,
      html: row.bodyHtml ?? `<p>${escapeHtml(row.bodyText)}</p>`,
      text: row.bodyText,
      // Resend retains idempotency keys for a bounded period. Stale sending
      // leases are quarantined below and never retried outside that window.
      idempotencyKey: `staff-order/${row.id}`,
    });
    if (!providerMessageId) {
      await prisma.staffOrderDelivery.update({ where: { id }, data: { status: 'failed', lastError: 'Email provider not configured' } });
      return;
    }
    await prisma.staffOrderDelivery.update({
      where: { id }, data: { status: 'sent', sentAt: new Date(), providerMessageId, lastError: null },
    });
  } catch (error) {
    if (error instanceof EmailProviderRejectedError) {
      if (error.retryable && row.attempts < MAX_ATTEMPTS) {
        const backoffMs = 5_000 * (2 ** Math.max(0, row.attempts - 1));
        await prisma.staffOrderDelivery.update({
          where: { id },
          data: { status: 'queued', nextAttemptAt: new Date(Date.now() + backoffMs), lastError: error.message },
        });
      } else {
        await prisma.staffOrderDelivery.update({
          where: { id }, data: { status: 'failed', lastError: error.message },
        });
      }
    } else {
      // An SDK/network exception does not prove Resend accepted or rejected.
      await markUnknown(id, error instanceof Error ? error.message : 'Email provider result unknown');
    }
  }
}

let running = false;
export async function processStaffOrderNotifications(limit = 20): Promise<number> {
  if (running || config.env !== 'production') return 0;
  if (!config.staffOrderNotifications.emailEnabled && !config.staffOrderNotifications.smsEnabled) return 0;
  running = true;
  try {
    await prisma.staffOrderDelivery.updateMany({
      where: { status: 'sending', claimedAt: { lt: new Date(Date.now() - LEASE_MS) } },
      data: { status: 'unknown', unknownAt: new Date(), lastError: 'Sending lease expired; provider acceptance is unknown' },
    });
    const ready = channelReadiness();
    const rows = await prisma.staffOrderDelivery.findMany({
      where: {
        status: 'queued',
        OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: new Date() } }],
        channel: {
          in: [
            ...(ready.email ? ['email'] : []),
            ...(ready.sms ? ['sms'] : []),
          ],
        },
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
      select: { id: true },
    });
    for (const row of rows) await processOne(row.id);
    return rows.length;
  } catch (error) {
    logger.warn('Staff paid-order notification worker skipped', { storageMissing: isMissingTable(error), error });
    return 0;
  } finally {
    running = false;
  }
}

let timer: ReturnType<typeof setInterval> | undefined;
export function startStaffOrderNotificationWorker() {
  if (timer || config.env !== 'production') return;
  timer = setInterval(() => void processStaffOrderNotifications(), 5_000);
  timer.unref();
  void processStaffOrderNotifications();
}
export function stopStaffOrderNotificationWorker() {
  if (timer) clearInterval(timer);
  timer = undefined;
}

export async function staffOrderNotificationStatus() {
  let storageReady = false;
  try {
    const rows = await prisma.$queryRaw<Array<{ ready: boolean }>>`
      SELECT to_regclass('public.staff_order_deliveries') IS NOT NULL AS ready`;
    storageReady = rows[0]?.ready === true;
  } catch {
    storageReady = false;
  }
  let activeRecipients = 0;
  try {
    const recipients = await prisma.orderNotificationRecipient.findMany({
      where: { isActive: true },
      select: { phoneNumber: true },
    });
    activeRecipients = new Set(
      recipients.map((recipient) => normalizePhone(recipient.phoneNumber)).filter(Boolean),
    ).size;
  } catch {}
  const production = config.env === 'production';
  const emailReady = production && storageReady && config.staffOrderNotifications.emailEnabled
    && Boolean(config.resend.apiKey && config.resend.from && process.env.ADMIN_EMAIL);
  const smsReady = production && storageReady && config.staffOrderNotifications.smsEnabled
    && config.staffOrderNotifications.smsProviderReady
    && Boolean(config.telnyx.apiKey && config.telnyx.fromNumber && config.telnyx.publicKey) && activeRecipients > 0;
  return {
    storageReady,
    email: {
      enabled: config.staffOrderNotifications.emailEnabled,
      ready: emailReady,
      recipient: process.env.ADMIN_EMAIL ?? '',
      reason: emailReady ? null : !production ? 'Live staff email is disabled outside production'
        : !storageReady ? 'Staff delivery migration is not applied'
          : !config.staffOrderNotifications.emailEnabled ? 'STAFF_ORDER_EMAIL_ENABLED is not true'
            : !process.env.ADMIN_EMAIL ? 'ADMIN_EMAIL is not configured'
              : !config.resend.apiKey || !config.resend.from ? 'Resend is not configured' : 'Not ready',
    },
    sms: {
      enabled: config.staffOrderNotifications.smsEnabled,
      ready: smsReady,
      activeRecipients,
      reason: smsReady ? null : !production ? 'Live staff SMS is disabled outside production'
        : !storageReady ? 'Staff delivery migration is not applied'
          : !config.staffOrderNotifications.smsEnabled ? 'STAFF_ORDER_SMS_ENABLED is not true'
            : !config.staffOrderNotifications.smsProviderReady ? 'STAFF_ORDER_SMS_PROVIDER_READY is not true'
              : !config.telnyx.apiKey || !config.telnyx.fromNumber || !config.telnyx.publicKey
                ? 'Telnyx messaging and signed webhook verification are not configured'
                : activeRecipients === 0 ? 'No active recipients' : 'Not ready',
    },
    app: { note: 'Expo staff push and printer delivery are independent of staff email/SMS.' },
  };
}

export async function recentStaffOrderDeliveries() {
  try {
    return await prisma.staffOrderDelivery.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true, orderNumber: true, source: true, channel: true, recipient: true,
        status: true, attempts: true, lastError: true, createdAt: true, sentAt: true,
      },
    });
  } catch (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
}