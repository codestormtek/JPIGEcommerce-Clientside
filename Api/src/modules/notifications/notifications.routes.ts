import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  listOutboxSchema,
  listSubscriptionsSchema,
  createSubscriptionSchema,
  updateSubscriptionSchema,
  listUserNotificationsSchema,
} from './notifications.schema';
import * as ctrl from './notifications.controller';

export const notificationsRouter = Router();

// ─── UserNotification inbox routes (authenticated users) ─────────────────────
// Registered BEFORE /:id to prevent static segments being matched as a param.

// GET    /api/v1/notifications/me
notificationsRouter.get(
  '/me',
  authenticate,
  validate(listUserNotificationsSchema, 'query'),
  asyncHandler(ctrl.listMyNotifications),
);

// PATCH  /api/v1/notifications/me/:notificationId/read
notificationsRouter.patch(
  '/me/:notificationId/read',
  authenticate,
  asyncHandler(ctrl.markNotificationRead),
);

// DELETE /api/v1/notifications/me/:notificationId
notificationsRouter.delete(
  '/me/:notificationId',
  authenticate,
  asyncHandler(ctrl.deleteMyNotification),
);

// ─── NotificationSubscription routes (authenticated users) ────────────────────

// GET    /api/v1/notifications/subscriptions
notificationsRouter.get(
  '/subscriptions',
  authenticate,
  validate(listSubscriptionsSchema, 'query'),
  asyncHandler(ctrl.listSubscriptions),
);

// POST   /api/v1/notifications/subscriptions
notificationsRouter.post(
  '/subscriptions',
  authenticate,
  validate(createSubscriptionSchema),
  asyncHandler(ctrl.createSubscription),
);

// PATCH  /api/v1/notifications/subscriptions/:subId
notificationsRouter.patch(
  '/subscriptions/:subId',
  authenticate,
  validate(updateSubscriptionSchema),
  asyncHandler(ctrl.updateSubscription),
);

// DELETE /api/v1/notifications/subscriptions/:subId
notificationsRouter.delete(
  '/subscriptions/:subId',
  authenticate,
  asyncHandler(ctrl.deleteSubscription),
);

// ─── MessageOutbox routes (admin only) ───────────────────────────────────────

// GET    /api/v1/notifications
notificationsRouter.get(
  '/',
  authenticate,
  authorize('admin'),
  validate(listOutboxSchema, 'query'),
  asyncHandler(ctrl.listOutbox),
);

// GET    /api/v1/notifications/:id
notificationsRouter.get(
  '/:id',
  authenticate,
  authorize('admin'),
  asyncHandler(ctrl.getOutboxById),
);

// DELETE /api/v1/notifications/:id
notificationsRouter.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  asyncHandler(ctrl.deleteOutboxMessage),
);

