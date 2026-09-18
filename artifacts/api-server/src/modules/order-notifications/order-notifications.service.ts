import { ApiError } from '../../utils/apiError';
import { sendSms } from '../../lib/telnyx';
import { logger } from '../../utils/logger';
import { config } from '../../config';
import * as repo from './order-notifications.repository';
import { CreateRecipientInput, UpdateRecipientInput } from './order-notifications.schema';
import { isSmsSuppressed } from '../../lib/smsSuppression';
import {
  recentStaffOrderDeliveries,
  staffOrderNotificationStatus,
} from '../../services/staffOrderNotifications';
import { normalizePhone } from '../../lib/phone';

export function listRecipients() {
  return repo.findAll();
}

export async function createRecipient(input: CreateRecipientInput) {
  const phoneNumber = normalizePhone(input.phoneNumber);
  if (!phoneNumber) throw ApiError.badRequest('Enter a valid SMS phone number.');
  const duplicate = (await repo.findAll()).some((recipient) =>
    normalizePhone(recipient.phoneNumber) === phoneNumber);
  if (duplicate) throw ApiError.badRequest('This phone number is already an order-alert recipient.');
  return repo.create({ ...input, phoneNumber });
}

export async function updateRecipient(id: string, input: UpdateRecipientInput) {
  const existing = await repo.findById(id);
  if (!existing) throw ApiError.notFound('Recipient');
  let phoneNumber: string | undefined;
  if (input.phoneNumber !== undefined) {
    phoneNumber = normalizePhone(input.phoneNumber) ?? undefined;
    if (!phoneNumber) throw ApiError.badRequest('Enter a valid SMS phone number.');
    const duplicate = (await repo.findAll()).some((recipient) =>
      recipient.id !== id && normalizePhone(recipient.phoneNumber) === phoneNumber);
    if (duplicate) throw ApiError.badRequest('This phone number is already an order-alert recipient.');
  }
  return repo.update(id, { ...input, ...(phoneNumber ? { phoneNumber } : {}) });
}

export async function deleteRecipient(id: string) {
  const existing = await repo.findById(id);
  if (!existing) throw ApiError.notFound('Recipient');
  await repo.remove(id);
  return { id };
}

export async function sendTest(id: string) {
  const recipient = await repo.findById(id);
  if (!recipient) throw ApiError.notFound('Recipient');
  if (!recipient.isActive) throw ApiError.badRequest('Recipient is inactive.');
  if (config.env !== 'production') {
    throw ApiError.badRequest('Live staff SMS tests are disabled outside production.');
  }
  if (!config.staffOrderNotifications.smsEnabled) {
    throw ApiError.badRequest('STAFF_ORDER_SMS_ENABLED is not true.');
  }
  if (!config.staffOrderNotifications.smsProviderReady) {
    throw ApiError.badRequest('STAFF_ORDER_SMS_PROVIDER_READY is not true.');
  }
  if (!config.telnyx.apiKey || !config.telnyx.fromNumber) {
    throw ApiError.badRequest('Telnyx staff SMS is not configured.');
  }
  if (!config.telnyx.publicKey) {
    throw ApiError.badRequest('Telnyx signed webhook verification is not configured.');
  }
  const testPhone = normalizePhone(recipient.phoneNumber);
  if (!testPhone) throw ApiError.badRequest('Recipient has an invalid phone number.');
  if (await isSmsSuppressed(testPhone)) {
    throw ApiError.badRequest('This number is suppressed and cannot receive SMS.');
  }
  const body = `[TEST] ${config.store.name} — new-order alerts are working. You'll get a text here when a customer places an order.`;
  const result = await sendSms(testPhone, body);
  if (!result.success) {
    throw ApiError.badRequest(result.error || 'Test SMS could not be sent.');
  }
  return { success: true, messageId: result.messageId };
}

export function getStatus() {
  return staffOrderNotificationStatus();
}

export function listDeliveries() {
  return recentStaffOrderDeliveries();
}

/**
 * Builds the store-side new-order alert text and sends it to every active
 * notification recipient. Fire-and-forget: never throws, logs failures.
 */
export async function sendNewOrderStoreAlerts(order: {
  orderNumber: string;
  customerName: string;
  customerPhone?: string | null;
  itemCount: number;
  items: Array<{
    name: string;
    qty: number;
    sides?: string | null;
  }>;
  grandTotal: number;
  currency: string;
}): Promise<void> {
  try {
    const recipients = await repo.findActive();
    if (recipients.length === 0) return;

    const itemParts = order.items.map((item) => {
      const sides = item.sides?.trim() ? ` (${item.sides.trim()})` : '';
      return `${item.qty}x ${item.name}${sides}`;
    });
    const customer = order.customerPhone
      ? `${order.customerName} (${order.customerPhone})`
      : order.customerName;
    const prefix =
      `New order ${order.orderNumber} - ${customer}. ` +
      `${order.itemCount} item${order.itemCount === 1 ? '' : 's'}: `;
    const suffix = `. Total ${order.currency} ${order.grandTotal.toFixed(2)}. - ${config.store.name}`;
    const maxBodyLength = 600;
    const availableForItems = Math.max(40, maxBodyLength - prefix.length - suffix.length);
    let itemSummary = '';
    for (let index = 0; index < itemParts.length; index += 1) {
      const separator = itemSummary ? '; ' : '';
      const next = `${itemSummary}${separator}${itemParts[index]}`;
      if (next.length <= availableForItems) {
        itemSummary = next;
        continue;
      }
      const remaining = itemParts.length - index;
      const more = `${separator}+${remaining} more item${remaining === 1 ? '' : 's'}`;
      itemSummary = `${itemSummary.slice(0, Math.max(0, availableForItems - more.length))}${more}`;
      break;
    }
    if (!itemSummary) itemSummary = 'No item details';
    const body = `${prefix}${itemSummary}${suffix}`.slice(0, maxBodyLength);

    await Promise.all(
      recipients.map((r) =>
        sendSms(r.phoneNumber, body).then((res) => {
          if (!res.success) {
            logger.warn('order-notifications: store alert not sent', {
              recipientId: r.id,
              error: res.error,
            });
          }
        }),
      ),
    );
  } catch (err) {
    logger.warn('order-notifications: store alerts failed', { err });
  }
}

/**
 * Builds the store-side new-registration alert text and sends it to every active
 * notification recipient (reuses the Order Alert Numbers). Fire-and-forget:
 * never throws, logs failures. No-ops silently if SMS keys are unconfigured.
 */
export async function sendNewUserStoreAlerts(user: {
  customerName: string;
  emailAddress: string;
  phoneNumber?: string | null;
}): Promise<void> {
  try {
    const recipients = await repo.findActive();
    if (recipients.length === 0) return;

    const body =
      `New customer registration — ${user.customerName} (${user.emailAddress})` +
      `${user.phoneNumber ? `, ${user.phoneNumber}` : ''}. ` +
      `Awaiting activation. — ${config.store.name}`;

    await Promise.all(
      recipients.map((r) =>
        sendSms(r.phoneNumber, body).then((res) => {
          if (!res.success) {
            logger.warn('order-notifications: new-user alert not sent', {
              recipientId: r.id,
              error: res.error,
            });
          }
        }),
      ),
    );
  } catch (err) {
    logger.warn('order-notifications: new-user alerts failed', { err });
  }
}
