import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import * as ctrl from './payment-gateway.controller';

export const paymentGatewayRouter = Router();

paymentGatewayRouter.get(
  '/status',
  authenticate,
  authorize('admin'),
  asyncHandler(ctrl.getStatus),
);

paymentGatewayRouter.post(
  '/',
  authenticate,
  authorize('admin'),
  asyncHandler(ctrl.saveConfig),
);

paymentGatewayRouter.post(
  '/test',
  authenticate,
  authorize('admin'),
  asyncHandler(ctrl.testConnection),
);
