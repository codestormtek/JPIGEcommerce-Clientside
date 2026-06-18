import { ApiError } from '../../utils/apiError';
import { sendSms } from '../../lib/telnyx';
import { logger } from '../../utils/logger';
import { config } from '../../config';
import * as repo from './order-notifications.repository';
import { CreateRecipientInput, UpdateRecipientInput } from './order-notifications.schema';

export function listRecipients() {
  return repo.findAll();
}

export async function createRecipient(input: CreateRecipientInput) {
  return repo.create(input);
}

export async function updateRecipient(id: string, input: UpdateRecipientInput) {
  const existing = await repo.findById(id);
  if (!existing) throw ApiError.notFound('Recipient');
  return repo.update(id, input);
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
  const body = `[TEST] ${config.store.name} — new-order alerts are working. You'll get a text here when a customer places an order.`;
  const result = await sendSms(recipient.phoneNumber, body);
  if (!result.success) {
    throw ApiError.badRequest(result.error || 'Test SMS could not be sent.');
  }
  return { success: true, messageId: result.messageId };
}

/**
 * Builds the store-side new-order alert text and sends it to every active
 * notification recipient. Fire-and-forget: never throws, logs failures.
 */
export async function sendNewOrderStoreAlerts(order: {
  orderNumber: string;
  customerName: string;
  itemCount: number;
  grandTotal: number;
  currency: string;
}): Promise<void> {
  try {
    const recipients = await repo.findActive();
    if (recipients.length === 0) return;

    const body =
      `New order ${order.orderNumber} — ${order.customerName}. ` +
      `${order.itemCount} item${order.itemCount === 1 ? '' : 's'}, ` +
      `${order.currency} ${order.grandTotal.toFixed(2)}. — ${config.store.name}`;

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
