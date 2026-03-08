import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validate } from '../../middleware/validate.middleware';
import { authenticate } from '../../middleware/auth.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  logoutSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from './auth.schema';
import * as ctrl from './auth.controller';

export const authRouter = Router();

// Tighter rate limit for authentication endpoints (brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  message: { success: false, message: 'Too many attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Public routes ────────────────────────────────────────────────────────────

// POST /api/v1/auth/register
authRouter.post(
  '/register',
  authLimiter,
  validate(registerSchema),
  asyncHandler(ctrl.register),
);

// POST /api/v1/auth/login
authRouter.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  asyncHandler(ctrl.login),
);

// POST /api/v1/auth/refresh
authRouter.post(
  '/refresh',
  validate(refreshSchema),
  asyncHandler(ctrl.refresh),
);

// POST /api/v1/auth/logout
authRouter.post(
  '/logout',
  validate(logoutSchema),
  asyncHandler(ctrl.logout),
);

// POST /api/v1/auth/forgot-password
authRouter.post(
  '/forgot-password',
  authLimiter,
  validate(forgotPasswordSchema),
  asyncHandler(ctrl.forgotPassword),
);

// POST /api/v1/auth/reset-password
authRouter.post(
  '/reset-password',
  authLimiter,
  validate(resetPasswordSchema),
  asyncHandler(ctrl.resetPassword),
);

// ─── Authenticated routes ─────────────────────────────────────────────────────

// GET  /api/v1/auth/me
authRouter.get('/me', authenticate, asyncHandler(ctrl.me));

// POST /api/v1/auth/logout-all  (revoke every session)
authRouter.post('/logout-all', authenticate, asyncHandler(ctrl.logoutAll));

// POST /api/v1/auth/change-password
authRouter.post(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  asyncHandler(ctrl.changePassword),
);

