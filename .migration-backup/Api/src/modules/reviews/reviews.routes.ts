import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import { listReviewsSchema, listCommentsSchema, updateReviewApprovalSchema } from './reviews.schema';
import * as ctrl from './reviews.controller';

export const reviewsRouter = Router();

// ─── Blog Comments (must come before /:id to avoid route collision) ───────────

// GET    /api/v1/reviews/comments
reviewsRouter.get(
  '/comments',
  authenticate,
  authorize('admin'),
  validate(listCommentsSchema, 'query'),
  asyncHandler(ctrl.listComments),
);

// GET    /api/v1/reviews/comments/:id
reviewsRouter.get(
  '/comments/:id',
  authenticate,
  authorize('admin'),
  asyncHandler(ctrl.getComment),
);

// PATCH  /api/v1/reviews/comments/:id/approval
reviewsRouter.patch(
  '/comments/:id/approval',
  authenticate,
  authorize('admin'),
  validate(updateReviewApprovalSchema),
  asyncHandler(ctrl.updateCommentApproval),
);

// DELETE /api/v1/reviews/comments/:id
reviewsRouter.delete(
  '/comments/:id',
  authenticate,
  authorize('admin'),
  asyncHandler(ctrl.deleteComment),
);

// ─── Product Reviews ──────────────────────────────────────────────────────────

// GET    /api/v1/reviews
reviewsRouter.get(
  '/',
  authenticate,
  authorize('admin'),
  validate(listReviewsSchema, 'query'),
  asyncHandler(ctrl.listReviews),
);

// GET    /api/v1/reviews/:id
reviewsRouter.get(
  '/:id',
  authenticate,
  authorize('admin'),
  asyncHandler(ctrl.getReview),
);

// PATCH  /api/v1/reviews/:id/approval
reviewsRouter.patch(
  '/:id/approval',
  authenticate,
  authorize('admin'),
  validate(updateReviewApprovalSchema),
  asyncHandler(ctrl.updateApproval),
);

// DELETE /api/v1/reviews/:id
reviewsRouter.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  asyncHandler(ctrl.deleteReview),
);
