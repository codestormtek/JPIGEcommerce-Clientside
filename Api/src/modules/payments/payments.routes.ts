import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import { listPaymentsSchema } from './payments.schema';
import * as ctrl from './payments.controller';

export const paymentsRouter = Router();

// POST /api/v1/payments/webhook  — must be listed FIRST (no auth, raw body already parsed)
paymentsRouter.post('/webhook', asyncHandler(ctrl.handleWebhook));

// All other payments routes are admin-only

// GET    /api/v1/payments
paymentsRouter.get(
  '/',
  authenticate,
  authorize('admin'),
  validate(listPaymentsSchema, 'query'),
  asyncHandler(ctrl.listPayments),
);

// PATCH  /api/v1/payments/:id/capture  (static action before /:id)
paymentsRouter.patch(
  '/:id/capture',
  authenticate,
  authorize('admin'),
  asyncHandler(ctrl.capturePayment),
);

// PATCH  /api/v1/payments/:id/refund
paymentsRouter.patch(
  '/:id/refund',
  authenticate,
  authorize('admin'),
  asyncHandler(ctrl.refundPayment),
);

// GET    /api/v1/payments/:id
paymentsRouter.get(
  '/:id',
  authenticate,
  authorize('admin'),
  asyncHandler(ctrl.getPaymentById),
);

