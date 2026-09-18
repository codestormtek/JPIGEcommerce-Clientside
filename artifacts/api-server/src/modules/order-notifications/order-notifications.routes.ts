import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import * as ctrl from './order-notifications.controller';
import { createRecipientSchema, updateRecipientSchema } from './order-notifications.schema';

export const orderNotificationsRouter = Router();

orderNotificationsRouter.use(authenticate, authorize('admin'));

orderNotificationsRouter.get('/', asyncHandler(ctrl.list));
orderNotificationsRouter.post('/', validate(createRecipientSchema), asyncHandler(ctrl.create));
// Static routes must precede /:id so "status" and "deliveries" are never
// interpreted as recipient identifiers.
orderNotificationsRouter.get('/status', asyncHandler(ctrl.status));
orderNotificationsRouter.get('/deliveries', asyncHandler(ctrl.deliveries));
orderNotificationsRouter.patch('/:id', validate(updateRecipientSchema), asyncHandler(ctrl.update));
orderNotificationsRouter.delete('/:id', asyncHandler(ctrl.remove));
orderNotificationsRouter.post('/:id/test', asyncHandler(ctrl.sendTest));
