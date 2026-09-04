import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import * as controller from './staff-orders.controller';
import {
  orderIdSchema,
  registerPushTokenSchema,
  staffOrderListSchema,
  tokenIdSchema,
  updatePushTokenSchema,
} from './staff-orders.schema';

export const staffOrdersRouter = Router();
staffOrdersRouter.use(authenticate, authorize('admin'));

staffOrdersRouter.get('/dashboard', asyncHandler(controller.dashboard));
staffOrdersRouter.put('/push-tokens', validate(registerPushTokenSchema), asyncHandler(controller.registerPushToken));
staffOrdersRouter.patch(
  '/push-tokens/:tokenId',
  validate(tokenIdSchema, 'params'),
  validate(updatePushTokenSchema),
  asyncHandler(controller.updatePushToken),
);
staffOrdersRouter.delete(
  '/push-tokens/:tokenId',
  validate(tokenIdSchema, 'params'),
  asyncHandler(controller.deletePushToken),
);
staffOrdersRouter.get('/', validate(staffOrderListSchema, 'query'), asyncHandler(controller.list));
staffOrdersRouter.get('/:orderId', validate(orderIdSchema, 'params'), asyncHandler(controller.detail));
staffOrdersRouter.post('/:orderId/start', validate(orderIdSchema, 'params'), asyncHandler(controller.start));
staffOrdersRouter.post('/:orderId/ready', validate(orderIdSchema, 'params'), asyncHandler(controller.ready));
staffOrdersRouter.post('/:orderId/picked-up', validate(orderIdSchema, 'params'), asyncHandler(controller.pickedUp));