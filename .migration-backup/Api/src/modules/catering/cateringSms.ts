import { sendSms } from '../../lib/telnyx';
import { config } from '../../config';
import { logger } from '../../utils/logger';

/**
 * Catering quote lifecycle SMS notifications.
 *
 * These are transactional: the customer submitted a catering quote request and
 * provided customerPhone specifically to receive updates about that quote, so we
 * text the number on the quote directly (catering submitters may be guests with
 * no registered account). Sends are fire-and-forget and never throw.
 */

interface QuoteForSms {
  id: string;
  quoteNumber: string;
  status?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  totalEstimate?: unknown;
  eventDate?: Date | string | null;
}

function fmtMoney(v: unknown): string {
  return `$${Number(v ?? 0).toFixed(2)}`;
}

function fmtEventDate(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  const date = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

/**
 * Builds the SMS body for a catering quote status transition.
 * Returns null for statuses that should not trigger a customer text.
 */
export function buildQuoteStatusMessage(status: string, quote: QuoteForSms): string | null {
  const name = (quote.customerName || '').split(' ')[0] || 'there';
  const num = quote.quoteNumber;
  const store = config.store.name;
  const eventDate = fmtEventDate(quote.eventDate);

  switch (status) {
    case 'QUOTED':
      return `Hi ${name}! Your catering quote ${num} is ready — estimated total ${fmtMoney(quote.totalEstimate)}. We'll follow up to finalize details, or reply with any questions. — ${store}`;
    case 'APPROVED':
      return `Great news ${name} — your catering quote ${num} is approved! We'll be in touch about your deposit and next steps to lock in your date. — ${store}`;
    case 'CONVERTED':
      return `You're booked! 🎉 Your catering order${eventDate ? ` for ${eventDate}` : ''} is confirmed (quote ${num}). We can't wait to feed your crew. — ${store}`;
    case 'REJECTED':
      return `Hi ${name}, there's an update on your catering quote ${num} — unfortunately we're unable to fulfill this request. Please reply or contact us about other options. — ${store}`;
    case 'EXPIRED':
      return `Hi ${name}, your catering quote ${num} has expired. Reply or visit us to request a fresh quote — we'd still love to cater your event! — ${store}`;
    default:
      return null;
  }
}

/**
 * Dispatches a status-change SMS for a catering quote if the status is notifiable
 * and the quote has a phone number. Safe to call fire-and-forget; never throws.
 */
export async function sendQuoteStatusSms(quote: QuoteForSms): Promise<void> {
  try {
    const status = quote.status;
    if (!status) return;

    const phone = (quote.customerPhone || '').trim();
    if (!phone) return;

    const body = buildQuoteStatusMessage(status, quote);
    if (!body) return;

    const result = await sendSms(phone, body);
    if (!result.success) {
      logger.warn('cateringSms: quote SMS not sent', { quoteId: quote.id, status, error: result.error });
    }
  } catch (err: unknown) {
    logger.warn('cateringSms: quote SMS failed', { quoteId: quote.id, err });
  }
}
