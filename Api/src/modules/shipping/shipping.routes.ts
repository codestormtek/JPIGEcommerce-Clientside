import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import { getRatesSchema } from './shipping.schema';
import * as ctrl from './shipping.controller';

export const shippingRouter = Router();

// POST /api/v1/shipping/rates  — authenticated (user must be logged in to get rates)
shippingRouter.post(
  '/rates',
  authenticate,
  validate(getRatesSchema),
  asyncHandler(ctrl.getShippingRates),
);
