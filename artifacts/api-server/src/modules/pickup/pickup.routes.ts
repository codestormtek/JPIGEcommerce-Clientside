import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import { validate } from '../../middleware/validate.middleware';
import { pickupCheckoutSchema, pickupConfigSchema } from './pickup.schema';
import * as ctrl from './pickup.controller';

export const pickupRouter = Router();

const checkoutLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many pickup checkout attempts. Please wait and try again.' },
});
const statusLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many pickup status requests. Please wait and try again.' },
});

pickupRouter.get('/', asyncHandler(ctrl.getPublicConfig));
pickupRouter.post('/orders', checkoutLimiter, validate(pickupCheckoutSchema), asyncHandler(ctrl.checkout));
// Recovery uses the persisted random request UUID and only observes a
// pre-existing attempt; it never replays a provider call.
pickupRouter.get('/orders/attempt/:requestId', statusLimiter, asyncHandler(ctrl.recoverOrderAttempt));
// There is intentionally no /orders/:id endpoint. The opaque capability is
// mandatory so UUIDs and order numbers cannot be used to read an order.
pickupRouter.get('/orders/:capability', statusLimiter, asyncHandler(ctrl.getOrderStatus));

pickupRouter.get('/admin/config', authenticate, authorize('admin'), asyncHandler(ctrl.getAdminConfig));
pickupRouter.put('/admin/config', authenticate, authorize('admin'), validate(pickupConfigSchema), asyncHandler(ctrl.updateAdminConfig));