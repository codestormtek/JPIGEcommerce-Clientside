import { Router } from 'express';
import { validate } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import { getRatesSchema } from './shipping.schema';
import * as ctrl from './shipping.controller';

export const shippingRouter = Router();

// POST /api/v1/shipping/rates — public (carrier rates are not user-specific data)
shippingRouter.post(
  '/rates',
  validate(getRatesSchema),
  asyncHandler(ctrl.getShippingRates),
);
