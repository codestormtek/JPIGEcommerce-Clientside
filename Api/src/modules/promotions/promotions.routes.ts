import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  listPromotionsSchema,
  createPromotionSchema,
  updatePromotionSchema,
  createCouponSchema,
  validateCouponSchema,
  listPromotionUsagesSchema,
} from './promotions.schema';
import * as ctrl from './promotions.controller';

export const promotionsRouter = Router();

// ─── Public routes (static prefix must be before /:id) ───────────────────────

// POST /api/v1/promotions/validate-coupon
promotionsRouter.post('/validate-coupon', validate(validateCouponSchema), asyncHandler(ctrl.validateCoupon));

// ─── Admin CRUD ───────────────────────────────────────────────────────────────

// GET    /api/v1/promotions
promotionsRouter.get('/', authenticate, authorize('admin'), validate(listPromotionsSchema, 'query'), asyncHandler(ctrl.listPromotions));

// POST   /api/v1/promotions
promotionsRouter.post('/', authenticate, authorize('admin'), validate(createPromotionSchema), asyncHandler(ctrl.createPromotion));

// GET    /api/v1/promotions/:id/usages  (must be before /:id to avoid conflict)
promotionsRouter.get(
  '/:id/usages',
  authenticate,
  authorize('admin'),
  validate(listPromotionUsagesSchema, 'query'),
  asyncHandler(ctrl.listPromotionUsages),
);

// GET    /api/v1/promotions/:id
promotionsRouter.get('/:id', authenticate, authorize('admin'), asyncHandler(ctrl.getPromotionById));

// PATCH  /api/v1/promotions/:id
promotionsRouter.patch('/:id', authenticate, authorize('admin'), validate(updatePromotionSchema), asyncHandler(ctrl.updatePromotion));

// DELETE /api/v1/promotions/:id
promotionsRouter.delete('/:id', authenticate, authorize('admin'), asyncHandler(ctrl.deletePromotion));

// ─── Coupons ──────────────────────────────────────────────────────────────────

// POST   /api/v1/promotions/:id/coupons
promotionsRouter.post('/:id/coupons', authenticate, authorize('admin'), validate(createCouponSchema), asyncHandler(ctrl.addCoupon));

// DELETE /api/v1/promotions/:id/coupons/:couponId
promotionsRouter.delete('/:id/coupons/:couponId', authenticate, authorize('admin'), asyncHandler(ctrl.removeCoupon));

