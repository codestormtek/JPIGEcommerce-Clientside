import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  listSubscribersSchema,
  createSubscriberSchema,
  updateSubscriberSchema,
  addSubscriptionSchema,
  updateSubscriptionSchema,
} from './subscribers.schema';
import * as ctrl from './subscribers.controller';

export const subscribersRouter = Router();

// ─── Subscribers ──────────────────────────────────────────────────────────────

// GET    /api/v1/subscribers              — admin: list all subscribers
subscribersRouter.get('/', authenticate, authorize('admin'), validate(listSubscribersSchema, 'query'), asyncHandler(ctrl.listSubscribers));

// POST   /api/v1/subscribers              — public: subscribe (opt-in)
subscribersRouter.post('/', validate(createSubscriberSchema), asyncHandler(ctrl.createSubscriber));

// GET    /api/v1/subscribers/:id          — admin: get subscriber
subscribersRouter.get('/:id', authenticate, authorize('admin'), asyncHandler(ctrl.getSubscriberById));

// PATCH  /api/v1/subscribers/:id          — admin: update subscriber
subscribersRouter.patch('/:id', authenticate, authorize('admin'), validate(updateSubscriberSchema), asyncHandler(ctrl.updateSubscriber));

// DELETE /api/v1/subscribers/:id          — admin: soft-delete subscriber
subscribersRouter.delete('/:id', authenticate, authorize('admin'), asyncHandler(ctrl.deleteSubscriber));

// ─── Subscriptions ────────────────────────────────────────────────────────────

// POST   /api/v1/subscribers/:id/subscriptions         — add topic
subscribersRouter.post('/:id/subscriptions', validate(addSubscriptionSchema), asyncHandler(ctrl.addSubscription));

// PATCH  /api/v1/subscribers/:id/subscriptions/:subId  — update topic
subscribersRouter.patch('/:id/subscriptions/:subId', validate(updateSubscriptionSchema), asyncHandler(ctrl.updateSubscription));

// DELETE /api/v1/subscribers/:id/subscriptions/:subId  — remove topic
subscribersRouter.delete('/:id/subscriptions/:subId', asyncHandler(ctrl.deleteSubscription));

