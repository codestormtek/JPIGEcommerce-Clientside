import { Request, Response } from 'express';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from '../../utils/apiResponse';
import {
  ListSubscribersInput, CreateSubscriberInput, UpdateSubscriberInput,
  AddSubscriptionInput, UpdateSubscriptionInput,
} from './subscribers.schema';
import * as service from './subscribers.service';

// ─── Subscribers ──────────────────────────────────────────────────────────────

// GET /api/v1/subscribers
export async function listSubscribers(req: Request, res: Response): Promise<void> {
  const result = await service.listSubscribers(req.query as unknown as ListSubscribersInput);
  sendPaginated(res, result);
}

// GET /api/v1/subscribers/:id
export async function getSubscriberById(req: Request, res: Response): Promise<void> {
  const sub = await service.getSubscriberById(req.params['id'] as string);
  sendSuccess(res, sub);
}

// POST /api/v1/subscribers
export async function createSubscriber(req: Request, res: Response): Promise<void> {
  const sub = await service.createSubscriber(req.body as CreateSubscriberInput);
  sendCreated(res, sub, 'Subscribed successfully');
}

// PATCH /api/v1/subscribers/:id
export async function updateSubscriber(req: Request, res: Response): Promise<void> {
  const sub = await service.updateSubscriber(req.params['id'] as string, req.body as UpdateSubscriberInput);
  sendSuccess(res, sub, 'Subscriber updated');
}

// DELETE /api/v1/subscribers/:id
export async function deleteSubscriber(req: Request, res: Response): Promise<void> {
  await service.deleteSubscriber(req.params['id'] as string);
  sendNoContent(res);
}

// ─── Subscriptions ────────────────────────────────────────────────────────────

// POST /api/v1/subscribers/:id/subscriptions
export async function addSubscription(req: Request, res: Response): Promise<void> {
  const sub = await service.addSubscription(req.params['id'] as string, req.body as AddSubscriptionInput);
  sendCreated(res, sub, 'Subscription added');
}

// PATCH /api/v1/subscribers/:id/subscriptions/:subId
export async function updateSubscription(req: Request, res: Response): Promise<void> {
  const sub = await service.updateSubscription(
    req.params['id'] as string,
    req.params['subId'] as string,
    req.body as UpdateSubscriptionInput,
  );
  sendSuccess(res, sub, 'Subscription updated');
}

// DELETE /api/v1/subscribers/:id/subscriptions/:subId
export async function deleteSubscription(req: Request, res: Response): Promise<void> {
  await service.deleteSubscription(req.params['id'] as string, req.params['subId'] as string);
  sendNoContent(res);
}

