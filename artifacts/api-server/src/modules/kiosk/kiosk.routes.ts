import { NextFunction, Request, Response, Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as ctrl from './kiosk.controller';
import { authenticateKiosk, lookupKioskDevice } from './kiosk.middleware';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  kioskOrderSchema,
  createKioskDeviceSchema,
  updateKioskDeviceSchema,
  createKioskCampaignSchema,
  updateKioskCampaignSchema,
} from './kiosk.schema';

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

// Brute-force guard for all kiosk-facing endpoints: per-IP, counting only
// FAILED requests (skipSuccessfulRequests), and requests carrying a VALID
// device token bypass it entirely (async skip + 30s token cache). So token
// guessing is cut off after 30 failures per 15 minutes, while real kiosks are
// never throttled or locked out — even if someone on the same restaurant
// Wi-Fi (shared IP) deliberately spams bad tokens to trip the limiter.
const kioskGeneralLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  skipSuccessfulRequests: true,
  skip: async (req) => {
    const token = req.header('x-kiosk-token');
    if (!token) return false;
    return (await lookupKioskDevice(token)) !== null;
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many failed requests — please wait and try again.' },
});

// Per-device throughput ceiling for authenticated kiosk traffic (kiosk routes
// are exempt from the app-level per-IP limiter, so this is the backstop
// against a malfunctioning or compromised device). Keyed by token so devices
// sharing one IP don't share a budget. 300/min is ~10x normal peak usage
// (2s payment polling ≈ 30/min plus menu/heartbeat).
const kioskDeviceLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.header('x-kiosk-token') || req.ip || 'unknown',
  message: { success: false, message: 'Too many requests — please slow down.' },
});

// Applied to every kiosk-facing route: brute-force guard first, then the
// per-device throughput ceiling.
const kioskLimiters = [kioskGeneralLimiter, kioskDeviceLimiter];

// GET /campaigns intentionally serves both device clients and admins. Select
// the authentication convention from the presented credential without ever
// accepting an unauthenticated request.
function authenticateCampaignList(req: Request, res: Response, next: NextFunction): void {
  if (req.header('x-kiosk-token')) {
    authenticateKiosk(req, res, next);
    return;
  }
  authenticate(req, res, (error?: unknown) => {
    if (error) return next(error);
    authorize('admin')(req, res, next);
  });
}

// ─── Kiosk-facing (X-Kiosk-Token) ────────────────────────────────────────────

// GET    /api/v1/kiosk/menu
kioskRouter.get('/menu', ...kioskLimiters, authenticateKiosk, asyncHandler(ctrl.getMenu));

// POST   /api/v1/kiosk/orders
kioskRouter.post('/orders', ...kioskLimiters, authenticateKiosk, kioskOrderLimiter, validate(kioskOrderSchema), asyncHandler(ctrl.createOrder));

// GET    /api/v1/kiosk/orders/:id/status
kioskRouter.get('/orders/:id/status', ...kioskLimiters, authenticateKiosk, asyncHandler(ctrl.getOrderStatus));

// POST   /api/v1/kiosk/heartbeat
kioskRouter.post('/heartbeat', ...kioskLimiters, authenticateKiosk, asyncHandler(ctrl.heartbeat));

// GET    /api/v1/kiosk/config — payment capabilities for this device
kioskRouter.get('/config', ...kioskLimiters, authenticateKiosk, asyncHandler(ctrl.getConfig));

// GET    /api/v1/kiosk/campaigns — active campaigns for devices; all for admins
kioskRouter.get('/campaigns', ...kioskLimiters, authenticateCampaignList, asyncHandler(ctrl.listCampaigns));

// GET    /api/v1/kiosk/orders/:id/payment — poll Terminal payment status
kioskRouter.get('/orders/:id/payment', ...kioskLimiters, authenticateKiosk, asyncHandler(ctrl.getPaymentStatus));

// POST   /api/v1/kiosk/orders/:id/cancel-payment — abort a pending Terminal checkout
kioskRouter.post('/orders/:id/cancel-payment', ...kioskLimiters, authenticateKiosk, asyncHandler(ctrl.cancelPayment));

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

// ─── Admin kiosk campaign management (JWT) ───────────────────────────────────

kioskRouter.post('/campaigns', authenticate, authorize('admin'), validate(createKioskCampaignSchema), asyncHandler(ctrl.createCampaign));
kioskRouter.get('/campaigns/:id', authenticate, authorize('admin'), asyncHandler(ctrl.getCampaign));
kioskRouter.patch('/campaigns/:id', authenticate, authorize('admin'), validate(updateKioskCampaignSchema), asyncHandler(ctrl.updateCampaign));
kioskRouter.delete('/campaigns/:id', authenticate, authorize('admin'), asyncHandler(ctrl.deleteCampaign));
