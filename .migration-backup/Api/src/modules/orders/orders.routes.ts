import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import { listOrdersSchema, placeOrderSchema, updateOrderStatusSchema, emailInvoiceSchema, guestCheckoutSchema, trackOrderSchema } from './orders.schema';
import * as ctrl from './orders.controller';

export const ordersRouter = Router();

// Throttle public, unauthenticated order endpoints (abuse / enumeration protection)
const guestCheckoutLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: { success: false, message: 'Too many checkout attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const trackOrderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  message: { success: false, message: 'Too many tracking attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Lookup routes (static — must be before /:id) ────────────────────────────

// GET  /api/v1/orders/statuses         (public)
ordersRouter.get('/statuses', asyncHandler(ctrl.listStatuses));

// GET  /api/v1/orders/shipping-methods (public)
ordersRouter.get('/shipping-methods', asyncHandler(ctrl.listShippingMethods));

// POST /api/v1/orders/guest            (public — guest checkout)
ordersRouter.post('/guest', guestCheckoutLimiter, validate(guestCheckoutSchema), asyncHandler(ctrl.guestCheckout));

// POST /api/v1/orders/track            (public — order tracking by number + email)
ordersRouter.post('/track', trackOrderLimiter, validate(trackOrderSchema), asyncHandler(ctrl.trackOrder));

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

// POST   /api/v1/orders/admin/:id/email-invoice
ordersRouter.post(
  '/admin/:id/email-invoice',
  authenticate,
  authorize('admin'),
  validate(emailInvoiceSchema),
  asyncHandler(ctrl.emailInvoice),
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

