import prisma from '../../lib/prisma';
import { sendSms } from '../../lib/telnyx';
import { config } from '../../config';
import { logger } from '../../utils/logger';

/**
 * Order lifecycle SMS notifications.
 *
 * Texts are only sent to customers who have explicitly opted in to order
 * notifications (UserContactPreference.optInSms === true). The phone used is
 * the dedicated smsPhone when present, otherwise the account phoneNumber.
 */

export interface OrderSmsRecipient {
  phone: string;
  firstName: string | null;
}

/**
 * Resolves the SMS phone for a user, respecting their order-text opt-in.
 * Returns null when the user has not opted in or has no usable phone number.
 */
export async function resolveOrderSmsRecipient(userId: string): Promise<OrderSmsRecipient | null> {
  const user = await prisma.siteUser.findUnique({
    where: { id: userId },
    select: {
      firstName: true,
      phoneNumber: true,
      contactPreference: { select: { optInSms: true, smsPhone: true } },
    },
  });

  if (!user) return null;

  const pref = user.contactPreference;
  if (!pref?.optInSms) return null;

  const phone = (pref.smsPhone || user.phoneNumber || '').trim();
  if (!phone) return null;

  return { phone, firstName: user.firstName };
}

export function formatOrderNumber(orderId: string): string {
  return `ORD-${orderId.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

interface OrderForSms {
  id: string;
  currency: string;
  grandTotal: unknown;
  orderStatus?: { status?: string } | null;
  shipment?: { carrier?: string | null; trackingNumber?: string | null } | null;
}

/**
 * Builds the SMS body for a given order status transition.
 * Returns null for statuses that should not trigger a customer text
 * (e.g. the initial "pending" state, which is covered by checkout confirmation).
 */
export function buildStatusMessage(
  status: string,
  ctx: { firstName: string | null; order: OrderForSms },
): string | null {
  const name = ctx.firstName || 'there';
  const orderNum = formatOrderNumber(ctx.order.id);
  const store = config.store.name;
  const ordersUrl = `${config.store.url}/orders`;

  switch (status) {
    case 'confirmed':
      return `Hi ${name}! Your order ${orderNum} is confirmed and we're getting it ready. Track it: ${ordersUrl} — ${store}`;
    case 'processing':
      return `Good news ${name} — your order ${orderNum} is now being prepared. 🔥 We'll text you when it's on the way. — ${store}`;
    case 'ready_to_ship':
      return `Your order ${orderNum} is packed and ready to go! You'll get tracking as soon as it ships. — ${store}`;
    case 'shipped': {
      const carrier = ctx.order.shipment?.carrier?.trim();
      const tracking = ctx.order.shipment?.trackingNumber?.trim();
      const trackingLine = tracking
        ? ` ${carrier ? carrier + ' ' : ''}tracking: ${tracking}.`
        : '';
      return `Your order ${orderNum} has shipped! 📦${trackingLine} Details: ${ordersUrl} — ${store}`;
    }
    case 'delivered':
      return `Your order ${orderNum} has been delivered. Dig in and enjoy! 🐷 Thanks for choosing ${store}.`;
    case 'cancelled':
      return `Your order ${orderNum} has been cancelled. If this wasn't expected, reply to this text or contact us. — ${store}`;
    case 'refunded':
      return `A refund for order ${orderNum} has been processed. It may take a few business days to appear. — ${store}`;
    default:
      return null;
  }
}

/**
 * Dispatches a status-change SMS for an order if the new status is notifiable
 * and the customer has opted in. Safe to call fire-and-forget; never throws.
 */
export async function sendOrderStatusSms(
  order: OrderForSms,
  userId: string,
): Promise<void> {
  try {
    const status = order.orderStatus?.status;
    if (!status) return;

    const recipient = await resolveOrderSmsRecipient(userId);
    if (!recipient) return;

    const body = buildStatusMessage(status, { firstName: recipient.firstName, order });
    if (!body) return;

    const result = await sendSms(recipient.phone, body);
    if (!result.success) {
      logger.warn('orderSms: status SMS not sent', { orderId: order.id, status, error: result.error });
    }
  } catch (err: unknown) {
    logger.warn('orderSms: status SMS failed', { orderId: order.id, err });
  }
}
