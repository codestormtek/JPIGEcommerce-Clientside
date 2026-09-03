import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  createStaffRefundSchema,
  listPaymentsSchema,
  paymentIdSchema,
  staffPaymentsListSchema,
} from './payments.schema';
import * as ctrl from './payments.controller';

export const paymentsRouter = Router();

// POST /api/v1/payments/webhook  — no auth, raw body already parsed
paymentsRouter.post('/webhook', asyncHandler(ctrl.handleWebhook));

// POST /api/v1/payments/square-webhook  — no auth, Square HMAC verified in controller
paymentsRouter.post('/square-webhook', asyncHandler(ctrl.handleSquareWebhook));

// GET /api/v1/payments/gateway-config — public; active gateway + public Square IDs only
paymentsRouter.get('/gateway-config', asyncHandler(ctrl.getGatewayConfig));

// All other payments routes are admin-only

paymentsRouter.get(
  '/mobile/dashboard',
  authenticate,
  authorize('admin'),
  asyncHandler(ctrl.getStaffPaymentDashboard),
);
paymentsRouter.get(
  '/mobile',
  authenticate,
  authorize('admin'),
  validate(staffPaymentsListSchema, 'query'),
  asyncHandler(ctrl.listStaffPayments),
);
paymentsRouter.get(
  '/mobile/:paymentId',
  authenticate,
  authorize('admin'),
  validate(paymentIdSchema, 'params'),
  asyncHandler(ctrl.getStaffPayment),
);
paymentsRouter.post(
  '/mobile/:paymentId/cancel',
  authenticate,
  authorize('admin'),
  validate(paymentIdSchema, 'params'),
  asyncHandler(ctrl.cancelStaffPayment),
);
paymentsRouter.post(
  '/mobile/:paymentId/refunds',
  authenticate,
  authorize('admin'),
  validate(paymentIdSchema, 'params'),
  validate(createStaffRefundSchema, 'body'),
  asyncHandler(ctrl.createStaffPaymentRefund),
);

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

