import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import { listReviewsSchema, updateReviewApprovalSchema } from './reviews.schema';
import * as ctrl from './reviews.controller';

export const reviewsRouter = Router();

// GET    /api/v1/reviews          — list all (admin)
reviewsRouter.get(
  '/',
  authenticate,
  authorize('admin'),
  validate(listReviewsSchema, 'query'),
  asyncHandler(ctrl.listReviews),
);

// GET    /api/v1/reviews/:id      — single review (admin)
reviewsRouter.get(
  '/:id',
  authenticate,
  authorize('admin'),
  asyncHandler(ctrl.getReview),
);

// PATCH  /api/v1/reviews/:id/approval — approve / disapprove (admin)
reviewsRouter.patch(
  '/:id/approval',
  authenticate,
  authorize('admin'),
  validate(updateReviewApprovalSchema),
  asyncHandler(ctrl.updateApproval),
);

// DELETE /api/v1/reviews/:id      — delete review (admin)
reviewsRouter.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  asyncHandler(ctrl.deleteReview),
);
