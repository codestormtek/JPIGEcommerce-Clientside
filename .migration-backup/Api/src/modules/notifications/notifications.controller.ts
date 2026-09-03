import crypto from 'crypto';
import { Request, Response } from 'express';
import { AuthRequest } from '../../types';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from '../../utils/apiResponse';
import {
  ListOutboxInput,
  ListSubscriptionsInput,
  CreateSubscriptionInput,
  UpdateSubscriptionInput,
  ListUserNotificationsInput,
  SendEmailInput,
  ListInboxInput,
  UpdateInboxMessageInput,
} from './notifications.schema';
import * as service from './notifications.service';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import prisma from '../../lib/prisma';

// ─── MessageOutbox (admin) ────────────────────────────────────────────────────

// GET /api/v1/notifications
export async function listOutbox(req: Request, res: Response): Promise<void> {
  const result = await service.listOutbox(req.query as unknown as ListOutboxInput);
  sendPaginated(res, result);
}

// GET /api/v1/notifications/:id
export async function getOutboxById(req: Request, res: Response): Promise<void> {
  const msg = await service.getOutboxById(req.params['id'] as string);
  sendSuccess(res, msg);
}

// DELETE /api/v1/notifications/:id
export async function deleteOutboxMessage(req: Request, res: Response): Promise<void> {
  await service.deleteOutboxMessage(req.params['id'] as string);
  sendNoContent(res);
}

// POST /api/v1/notifications/send
export async function sendManualEmail(req: AuthRequest, res: Response): Promise<void> {
  const msg = await service.sendManualEmail(req.body as SendEmailInput);
  sendCreated(res, msg, 'Email sent');
}

// ─── Resend Webhook ───────────────────────────────────────────────────────────

/**
 * Verify Resend (Svix) webhook signature without the svix npm package.
 * Svix signs: "{svix-id}.{svix-timestamp}.{raw-body}" with HMAC-SHA256
 * using the base64-decoded secret (strip the "whsec_" prefix first).
 */
function verifyResendSignature(
  payload: Buffer,
  headers: Record<string, string | string[] | undefined>,
  secret: string,
): boolean {
  const msgId        = headers['svix-id'] as string | undefined;
  const msgTimestamp = headers['svix-timestamp'] as string | undefined;
  const msgSignature = headers['svix-signature'] as string | undefined;

  if (!msgId || !msgTimestamp || !msgSignature) return false;

  // Reject timestamps more than 5 minutes old (replay protection)
  const ts = parseInt(msgTimestamp, 10);
  if (Math.abs(Date.now() / 1000 - ts) > 300) return false;

  const secretBytes  = Buffer.from(secret.replace('whsec_', ''), 'base64');
  const signedContent = `${msgId}.${msgTimestamp}.${payload.toString()}`;
  const computed = crypto.createHmac('sha256', secretBytes).update(signedContent).digest('base64');

  // svix-signature may contain multiple space-separated "v1,<base64>" entries
  return msgSignature.split(' ').some((entry) => {
    const sig = entry.replace(/^v1,/, '');
    try {
      return crypto.timingSafeEqual(Buffer.from(sig, 'base64'), Buffer.from(computed, 'base64'));
    } catch {
      return false;
    }
  });
}

// Map Resend event type → MessageOutbox.status
const EVENT_STATUS_MAP: Record<string, string> = {
  'email.sent':             'sent',
  'email.delivered':        'delivered',
  'email.bounced':          'failed',
  'email.complained':       'failed',
  'email.delivery_delayed': 'sending',
};

// POST /api/v1/notifications/resend-webhook  (no auth — verified by Resend signature)
export async function handleResendWebhook(req: Request, res: Response): Promise<void> {
  const secret = config.resend.webhookSecret;

  if (secret) {
    const valid = verifyResendSignature(
      req.body as Buffer,
      req.headers as Record<string, string | undefined>,
      secret,
    );
    if (!valid) {
      logger.warn('Resend webhook: invalid signature');
      res.status(401).json({ error: 'Invalid webhook signature' });
      return;
    }
  } else {
    logger.warn('Resend webhook: RESEND_WEBHOOK_SECRET not set — skipping signature verification');
  }

  let event: { type: string; created_at: string; data: Record<string, unknown> };
  try {
    event = JSON.parse((req.body as Buffer).toString());
  } catch {
    res.status(400).json({ error: 'Invalid JSON payload' });
    return;
  }

  const { type, data } = event;
  const emailId = (data?.email_id ?? data?.id) as string | undefined;

  logger.info(`Resend webhook: ${type}`, { emailId });

  if (emailId) {
    const outbox = await prisma.messageOutbox.findFirst({
      where: { providerMessageId: emailId },
    });

    if (outbox) {
      const newStatus = EVENT_STATUS_MAP[type];

      if (newStatus) {
        await prisma.messageOutbox.update({
          where: { id: outbox.id },
          data: {
            status: newStatus,
            ...(newStatus === 'delivered' ? { sentAt: new Date() } : {}),
            ...(newStatus === 'failed'
              ? { lastError: (data?.bounce as Record<string, unknown>)?.message as string ?? type }
              : {}),
          },
        });
      }

      // Log every event for audit / debugging
      await prisma.messageDeliveryLog.create({
        data: {
          outboxId:     outbox.id,
          attempt:      1,
          status:       type,
          responseJson: JSON.stringify(event),
        },
      });
    } else {
      logger.warn(`Resend webhook: no outbox record found for providerMessageId=${emailId}`);
    }
  }

  // Always respond 200 quickly so Resend doesn't retry
  res.json({ received: true });
}

// ─── Resend Inbound Webhook ───────────────────────────────────────────────────

// POST /api/v1/notifications/inbound  (no auth — called by Resend when email is received)
export async function handleResendInbound(req: Request, res: Response): Promise<void> {
  // Resend sends inbound as parsed JSON (not Svix-signed like delivery webhooks)
  const body = req.body as Record<string, unknown>;

  const from      = (body['from'] as string | undefined) ?? '';
  const toRaw     = body['to'];
  const to        = Array.isArray(toRaw) ? (toRaw[0] as string) : (toRaw as string ?? '');
  const subject   = (body['subject'] as string | undefined) ?? null;
  const html      = (body['html'] as string | undefined) ?? null;
  const text      = (body['text'] as string | undefined) ?? null;
  const messageId = (body['messageId'] as string | undefined) ?? null;
  const spamScore = typeof body['spamScore'] === 'number' ? (body['spamScore'] as number) : null;

  logger.info('Resend inbound email received', { from, to, subject, messageId });

  try {
    await prisma.messageInbox.create({
      data: {
        fromAddress: from,
        toAddress:   to,
        subject,
        bodyHtml:    html,
        bodyText:    text,
        messageId,
        spamScore,
        headersJson: body['headers'] ? JSON.stringify(body['headers']) : null,
      },
    });
  } catch (err: unknown) {
    // If messageId conflicts (duplicate delivery), swallow and ack
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('Unique constraint')) {
      logger.warn('Resend inbound: duplicate messageId, skipping', { messageId });
    } else {
      throw err;
    }
  }

  res.json({ received: true });
}

// ─── MessageInbox CRUD (admin) ────────────────────────────────────────────────

// GET /api/v1/notifications/inbox
export async function listInbox(req: Request, res: Response): Promise<void> {
  const result = await service.listInbox(req.query as unknown as ListInboxInput);
  sendPaginated(res, result);
}

// GET /api/v1/notifications/inbox/:id
export async function getInboxById(req: Request, res: Response): Promise<void> {
  const msg = await service.getInboxById(req.params['id'] as string);
  // Mark as read automatically when opened
  if (!msg.isRead) {
    await service.updateInboxMessage(msg.id, { isRead: true });
  }
  sendSuccess(res, { ...msg, isRead: true });
}

// PATCH /api/v1/notifications/inbox/:id
export async function updateInboxMessage(req: Request, res: Response): Promise<void> {
  const msg = await service.updateInboxMessage(
    req.params['id'] as string,
    req.body as UpdateInboxMessageInput,
  );
  sendSuccess(res, msg);
}

// DELETE /api/v1/notifications/inbox/:id
export async function deleteInboxMessage(req: Request, res: Response): Promise<void> {
  await service.deleteInboxMessage(req.params['id'] as string);
  sendNoContent(res);
}

// ─── NotificationSubscription ─────────────────────────────────────────────────

// GET /api/v1/notifications/subscriptions
export async function listSubscriptions(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const result = await service.listSubscriptions(userId, req.query as unknown as ListSubscriptionsInput);
  sendPaginated(res, result);
}

// POST /api/v1/notifications/subscriptions
export async function createSubscription(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const sub = await service.createSubscription(userId, req.body as CreateSubscriptionInput);
  sendCreated(res, sub, 'Subscription created');
}

// PATCH /api/v1/notifications/subscriptions/:subId
export async function updateSubscription(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const sub = await service.updateSubscription(userId, req.params['subId'] as string, req.body as UpdateSubscriptionInput);
  sendSuccess(res, sub, 'Subscription updated');
}

// DELETE /api/v1/notifications/subscriptions/:subId
export async function deleteSubscription(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.sub;
  await service.deleteSubscription(userId, req.params['subId'] as string);
  sendNoContent(res);
}

// ─── UserNotification inbox ────────────────────────────────────────────────────

// GET  /api/v1/notifications/me
export async function listMyNotifications(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const result = await service.listUserNotifications(userId, req.query as unknown as ListUserNotificationsInput);
  sendPaginated(res, result);
}

// PATCH /api/v1/notifications/me/:notificationId/read
export async function markNotificationRead(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const notification = await service.markNotificationRead(userId, req.params['notificationId'] as string);
  sendSuccess(res, notification, 'Notification marked as read');
}

// DELETE /api/v1/notifications/me/:notificationId
export async function deleteMyNotification(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.sub;
  await service.deleteUserNotification(userId, req.params['notificationId'] as string);
  sendNoContent(res);
}

