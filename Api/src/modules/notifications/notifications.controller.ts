import { Request, Response } from 'express';
import { AuthRequest } from '../../types';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from '../../utils/apiResponse';
import {
  ListOutboxInput,
  ListSubscriptionsInput,
  CreateSubscriptionInput,
  UpdateSubscriptionInput,
  ListUserNotificationsInput,
} from './notifications.schema';
import * as service from './notifications.service';

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

