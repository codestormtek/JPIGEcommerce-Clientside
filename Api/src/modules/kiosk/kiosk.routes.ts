import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as ctrl from './kiosk.controller';
import { authenticateKiosk } from './kiosk.middleware';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import { kioskOrderSchema, createKioskDeviceSchema, updateKioskDeviceSchema } from './kiosk.schema';

export const kioskRouter = Router();

// Kiosk order placement is rate-limited per device/IP — an unattended public
// device should never be able to flood the kitchen.
const kioskOrderLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 6,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many orders — please wait a moment.' },
});

// ─── Kiosk-facing (X-Kiosk-Token) ────────────────────────────────────────────

// GET    /api/v1/kiosk/menu
kioskRouter.get('/menu', authenticateKiosk, asyncHandler(ctrl.getMenu));

// POST   /api/v1/kiosk/orders
kioskRouter.post('/orders', authenticateKiosk, kioskOrderLimiter, validate(kioskOrderSchema), asyncHandler(ctrl.createOrder));

// GET    /api/v1/kiosk/orders/:id/status
kioskRouter.get('/orders/:id/status', authenticateKiosk, asyncHandler(ctrl.getOrderStatus));

// POST   /api/v1/kiosk/heartbeat
kioskRouter.post('/heartbeat', authenticateKiosk, asyncHandler(ctrl.heartbeat));

// GET    /api/v1/kiosk/config — payment capabilities for this device
kioskRouter.get('/config', authenticateKiosk, asyncHandler(ctrl.getConfig));

// GET    /api/v1/kiosk/orders/:id/payment — poll Terminal payment status
kioskRouter.get('/orders/:id/payment', authenticateKiosk, asyncHandler(ctrl.getPaymentStatus));

// POST   /api/v1/kiosk/orders/:id/cancel-payment — abort a pending Terminal checkout
kioskRouter.post('/orders/:id/cancel-payment', authenticateKiosk, asyncHandler(ctrl.cancelPayment));

// ─── Admin device management (JWT) ───────────────────────────────────────────

// GET    /api/v1/kiosk/devices
kioskRouter.get('/devices', authenticate, authorize('admin'), asyncHandler(ctrl.listDevices));

// POST   /api/v1/kiosk/devices
kioskRouter.post('/devices', authenticate, authorize('admin'), validate(createKioskDeviceSchema), asyncHandler(ctrl.createDevice));

// PATCH  /api/v1/kiosk/devices/:id
kioskRouter.patch('/devices/:id', authenticate, authorize('admin'), validate(updateKioskDeviceSchema), asyncHandler(ctrl.updateDevice));

// DELETE /api/v1/kiosk/devices/:id — deletes if unused, otherwise revokes
kioskRouter.delete('/devices/:id', authenticate, authorize('admin'), asyncHandler(ctrl.deleteDevice));

// POST   /api/v1/kiosk/devices/:id/pair-terminal — generate a Square Terminal device code
kioskRouter.post('/devices/:id/pair-terminal', authenticate, authorize('admin'), asyncHandler(ctrl.startPairing));

// GET    /api/v1/kiosk/devices/:id/pair-terminal/:codeId — poll pairing status
kioskRouter.get('/devices/:id/pair-terminal/:codeId', authenticate, authorize('admin'), asyncHandler(ctrl.checkPairing));
