import prisma from '../lib/prisma';
import { sendSms } from '../lib/telnyx';
import { config } from '../config';
import { logger } from '../utils/logger';

/**
 * Repeatable job — runs once daily.
 * Texts a reminder to customers whose booked (CONVERTED) catering event is
 * exactly REMINDER_DAYS_BEFORE days away.
 *
 * Idempotency: each sent reminder is recorded in MessageOutbox with a
 * templateKey + the quote id embedded in payloadJson. Before sending we check
 * for an existing record, so re-runs (or a manual "Run Now") never double-text.
 */

const REMINDER_DAYS_BEFORE = 3;
const TEMPLATE_KEY = 'catering_event_reminder';

function fmtEventDate(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export async function cateringEventReminderProcessor(): Promise<void> {
  // Target the single calendar day that is REMINDER_DAYS_BEFORE days out (UTC).
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + REMINDER_DAYS_BEFORE));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + REMINDER_DAYS_BEFORE + 1));

  const quotes = await prisma.cateringQuote.findMany({
    where: {
      status: 'CONVERTED',
      eventDate: { gte: start, lt: end },
      customerPhone: { not: null },
    },
    select: {
      id: true,
      quoteNumber: true,
      customerName: true,
      customerPhone: true,
      eventDate: true,
      eventTime: true,
      guestCount: true,
    },
  });

  if (quotes.length === 0) {
    logger.info('cateringEventReminder: no events to remind', { targetDate: start.toISOString().slice(0, 10) });
    return;
  }

  let sent = 0;
  let skipped = 0;

  for (const q of quotes) {
    const phone = (q.customerPhone || '').trim();
    if (!phone) continue;

    // Skip if a reminder for this quote was already recorded as sent.
    const already = await prisma.messageOutbox.findFirst({
      where: { templateKey: TEMPLATE_KEY, status: 'sent', payloadJson: { contains: q.id } },
      select: { id: true },
    });
    if (already) {
      skipped++;
      continue;
    }

    const name = (q.customerName || '').split(' ')[0] || 'there';
    const dateLabel = fmtEventDate(q.eventDate);
    const timePart = q.eventTime ? ` at ${q.eventTime}` : '';
    const body =
      `Hi ${name}! Just a reminder — your BBQ catering (quote ${q.quoteNumber}) is coming up in ${REMINDER_DAYS_BEFORE} days, ` +
      `${dateLabel}${timePart}, for ${q.guestCount} guests. Need to make a change? Reply or give us a call. — ${config.store.name}`;

    const result = await sendSms(phone, body);

    if (result.success) {
      await prisma.messageOutbox.create({
        data: {
          channel: 'sms',
          toAddress: phone,
          templateKey: TEMPLATE_KEY,
          bodyText: body,
          payloadJson: JSON.stringify({ quoteId: q.id, eventDate: q.eventDate.toISOString().slice(0, 10), daysBefore: REMINDER_DAYS_BEFORE }),
          status: 'sent',
          provider: 'telnyx',
          providerMessageId: result.messageId,
          sentAt: new Date(),
        },
      });
      sent++;
    } else {
      // No outbox record on failure, so it retries on the next run.
      logger.warn('cateringEventReminder: reminder SMS failed', { quoteId: q.id, error: result.error });
    }
  }

  logger.info('cateringEventReminder: run complete', {
    targetDate: start.toISOString().slice(0, 10),
    candidates: quotes.length,
    sent,
    skipped,
  });
}
