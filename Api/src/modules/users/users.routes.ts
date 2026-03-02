import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  listUsersSchema,
  adminUpdateUserSchema,
  updateProfileSchema,
  upsertAddressSchema,
  updateContactPreferencesSchema,
  createReviewSchema,
  listReviewsSchema,
  addPaymentMethodSchema,
} from './users.schema';
import * as ctrl from './users.controller';

export const usersRouter = Router();

// ─── Self routes (any authenticated user) ────────────────────────────────────

// GET    /api/v1/users/me
usersRouter.get('/me', authenticate, asyncHandler(ctrl.getMyProfile));

// PATCH  /api/v1/users/me
usersRouter.patch('/me', authenticate, validate(updateProfileSchema), asyncHandler(ctrl.updateMyProfile));

// GET    /api/v1/users/me/addresses
usersRouter.get('/me/addresses', authenticate, asyncHandler(ctrl.getMyAddresses));

// POST   /api/v1/users/me/addresses
usersRouter.post('/me/addresses', authenticate, validate(upsertAddressSchema), asyncHandler(ctrl.addMyAddress));

// DELETE /api/v1/users/me/addresses/:addressId
usersRouter.delete('/me/addresses/:addressId', authenticate, asyncHandler(ctrl.removeMyAddress));

// PATCH  /api/v1/users/me/addresses/:addressId/default
usersRouter.patch('/me/addresses/:addressId/default', authenticate, asyncHandler(ctrl.setMyDefaultAddress));

// GET    /api/v1/users/me/contact-preferences
usersRouter.get('/me/contact-preferences', authenticate, asyncHandler(ctrl.getMyContactPreferences));

// PATCH  /api/v1/users/me/contact-preferences
usersRouter.patch('/me/contact-preferences', authenticate, validate(updateContactPreferencesSchema), asyncHandler(ctrl.upsertMyContactPreferences));

// GET    /api/v1/users/me/reviews
usersRouter.get('/me/reviews', authenticate, validate(listReviewsSchema, 'query'), asyncHandler(ctrl.listMyReviews));

// POST   /api/v1/users/me/reviews
usersRouter.post('/me/reviews', authenticate, validate(createReviewSchema), asyncHandler(ctrl.createReview));

// GET    /api/v1/users/me/payment-methods
usersRouter.get('/me/payment-methods', authenticate, asyncHandler(ctrl.getMyPaymentMethods));

// POST   /api/v1/users/me/payment-methods
usersRouter.post('/me/payment-methods', authenticate, validate(addPaymentMethodSchema), asyncHandler(ctrl.addMyPaymentMethod));

// PATCH  /api/v1/users/me/payment-methods/:tokenId/default
usersRouter.patch('/me/payment-methods/:tokenId/default', authenticate, asyncHandler(ctrl.setMyDefaultPaymentMethod));

// DELETE /api/v1/users/me/payment-methods/:tokenId
usersRouter.delete('/me/payment-methods/:tokenId', authenticate, asyncHandler(ctrl.removeMyPaymentMethod));

// ─── Admin routes ─────────────────────────────────────────────────────────────

// GET    /api/v1/users/reviews  (admin: list all)
usersRouter.get('/reviews', authenticate, authorize('admin'), validate(listReviewsSchema, 'query'), asyncHandler(ctrl.listReviews));

// PATCH  /api/v1/users/reviews/:reviewId/approve  (admin)
usersRouter.patch('/reviews/:reviewId/approve', authenticate, authorize('admin'), asyncHandler(ctrl.approveReview));

// DELETE /api/v1/users/reviews/:reviewId  (admin or owner via service guard)
usersRouter.delete('/reviews/:reviewId', authenticate, asyncHandler(ctrl.deleteReview));

// GET    /api/v1/users
usersRouter.get('/', authenticate, authorize('admin'), validate(listUsersSchema, 'query'), asyncHandler(ctrl.listUsers));

// GET    /api/v1/users/:id
usersRouter.get('/:id', authenticate, authorize('admin'), asyncHandler(ctrl.getUserById));

// PATCH  /api/v1/users/:id
usersRouter.patch('/:id', authenticate, authorize('admin'), validate(adminUpdateUserSchema), asyncHandler(ctrl.adminUpdateUser));

// DELETE /api/v1/users/:id
usersRouter.delete('/:id', authenticate, authorize('admin'), asyncHandler(ctrl.deleteUser));

