import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import { getRatesSchema } from './shipping.schema';
import * as ctrl from './shipping.controller';

export const shippingRouter = Router();

// GET /api/v1/shipping/config — admin only
shippingRouter.get(
  '/config',
  authenticate,
  authorize('admin'),
  asyncHandler(ctrl.getShippingConfig),
);

// POST /api/v1/shipping/rates — public
shippingRouter.post(
  '/rates',
  validate(getRatesSchema),
  asyncHandler(ctrl.getShippingRates),
);
