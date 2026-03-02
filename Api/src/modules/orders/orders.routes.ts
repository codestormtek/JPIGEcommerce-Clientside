import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import { listOrdersSchema, placeOrderSchema, updateOrderStatusSchema } from './orders.schema';
import * as ctrl from './orders.controller';

export const ordersRouter = Router();

// ─── Lookup routes (static — must be before /:id) ────────────────────────────

// GET  /api/v1/orders/statuses         (public)
ordersRouter.get('/statuses', asyncHandler(ctrl.listStatuses));

// GET  /api/v1/orders/shipping-methods (public)
ordersRouter.get('/shipping-methods', asyncHandler(ctrl.listShippingMethods));

// ─── Admin routes ─────────────────────────────────────────────────────────────

// GET    /api/v1/orders/admin          (admin — all orders)
ordersRouter.get(
  '/admin',
  authenticate,
  authorize('admin'),
  validate(listOrdersSchema, 'query'),
  asyncHandler(ctrl.listAllOrders),
);

// GET    /api/v1/orders/admin/:id      (admin — any order)
ordersRouter.get(
  '/admin/:id',
  authenticate,
  authorize('admin'),
  asyncHandler(ctrl.getOrderById),
);

// GET    /api/v1/orders/admin/:id/invoice
ordersRouter.get(
  '/admin/:id/invoice',
  authenticate,
  authorize('admin'),
  asyncHandler(ctrl.getAdminInvoice),
);

// PATCH  /api/v1/orders/admin/:id/status
ordersRouter.patch(
  '/admin/:id/status',
  authenticate,
  authorize('admin'),
  validate(updateOrderStatusSchema),
  asyncHandler(ctrl.updateOrderStatus),
);

// ─── User routes ──────────────────────────────────────────────────────────────

// GET  /api/v1/orders              (my orders)
ordersRouter.get(
  '/',
  authenticate,
  validate(listOrdersSchema, 'query'),
  asyncHandler(ctrl.listMyOrders),
);

// GET  /api/v1/orders/:id          (my order detail)
ordersRouter.get('/:id', authenticate, asyncHandler(ctrl.getMyOrder));

// GET  /api/v1/orders/:id/invoice  (my invoice)
ordersRouter.get('/:id/invoice', authenticate, asyncHandler(ctrl.getMyInvoice));

// POST /api/v1/orders              (checkout)
ordersRouter.post(
  '/',
  authenticate,
  validate(placeOrderSchema),
  asyncHandler(ctrl.placeOrder),
);

