import { Request, Response } from 'express';
import { AuthRequest } from '../../types';
import { sendSuccess, sendNoContent, sendPaginated } from '../../utils/apiResponse';
import {
  ListUsersInput, AdminUpdateUserInput, UpdateProfileInput, UpsertAddressInput,
  UpdateContactPreferencesInput, CreateReviewInput, ListReviewsInput,
  AddPaymentMethodInput, ListPaymentMethodsInput,
} from './users.schema';
import { ctxFromRequest } from '../../utils/auditLogger';
import * as service from './users.service';
import * as mediaService from '../media/media.service';

// ─── Admin handlers ───────────────────────────────────────────────────────────

export async function listUsers(req: Request, res: Response): Promise<void> {
  const result = await service.listUsers(req.query as unknown as ListUsersInput);
  sendPaginated(res, result);
}

export async function getUserById(req: Request, res: Response): Promise<void> {
  const user = await service.getUserById(req.params['id'] as string);
  sendSuccess(res, user);
}

export async function adminUpdateUser(req: AuthRequest, res: Response): Promise<void> {
  const user = await service.adminUpdateUser(
    req.params['id'] as string,
    req.body as AdminUpdateUserInput,
    ctxFromRequest(req, req.user?.sub),
  );
  sendSuccess(res, user);
}

export async function deleteUser(req: AuthRequest, res: Response): Promise<void> {
  await service.deleteUser(req.params['id'] as string, ctxFromRequest(req, req.user?.sub));
  sendNoContent(res);
}

export async function getUserOrders(req: Request, res: Response): Promise<void> {
  const page = parseInt(req.query['page'] as string) || 1;
  const limit = parseInt(req.query['limit'] as string) || 20;
  const result = await service.getUserOrders(req.params['id'] as string, page, limit);
  sendPaginated(res, result);
}

export async function getUserAddresses(req: Request, res: Response): Promise<void> {
  const addresses = await service.getUserAddresses(req.params['id'] as string);
  sendSuccess(res, addresses);
}

export async function listAllAddresses(req: Request, res: Response): Promise<void> {
  const result = await service.listAllAddresses({
    page: parseInt(req.query['page'] as string) || 1,
    limit: parseInt(req.query['limit'] as string) || 20,
    search: req.query['search'] as string | undefined,
    city: req.query['city'] as string | undefined,
    region: req.query['region'] as string | undefined,
    countryId: req.query['countryId'] as string | undefined,
    orderBy: (req.query['orderBy'] as string) || 'label',
    order: (req.query['order'] as 'asc' | 'desc') || 'asc',
  });
  sendPaginated(res, result);
}

// ─── Self handlers ────────────────────────────────────────────────────────────

export async function getMyProfile(req: AuthRequest, res: Response): Promise<void> {
  const user = await service.getMyProfile(req.user!.sub);
  sendSuccess(res, user);
}

export async function updateMyProfile(req: AuthRequest, res: Response): Promise<void> {
  const user = await service.updateMyProfile(req.user!.sub, req.body as UpdateProfileInput);
  sendSuccess(res, user);
}

export async function uploadMyAvatar(req: AuthRequest, res: Response): Promise<void> {
  if (!req.file) throw new Error('No file attached');
  const asset = await mediaService.uploadMediaFile(req.file, 'avatars');
  const user = await service.updateMyProfile(req.user!.sub, { avatarUrl: asset.url });
  sendSuccess(res, user, 'Avatar updated');
}

// ─── Address handlers ─────────────────────────────────────────────────────────

export async function getMyAddresses(req: AuthRequest, res: Response): Promise<void> {
  const addresses = await service.getMyAddresses(req.user!.sub);
  sendSuccess(res, addresses);
}

export async function addMyAddress(req: AuthRequest, res: Response): Promise<void> {
  const address = await service.addMyAddress(req.user!.sub, req.body as UpsertAddressInput);
  sendSuccess(res, address, 'Address added', 201);
}

export async function updateMyAddress(req: AuthRequest, res: Response): Promise<void> {
  const address = await service.updateMyAddress(req.user!.sub, req.params['addressId'] as string, req.body as UpsertAddressInput);
  sendSuccess(res, address, 'Address updated');
}

export async function removeMyAddress(req: AuthRequest, res: Response): Promise<void> {
  await service.removeMyAddress(req.user!.sub, req.params['addressId'] as string);
  sendNoContent(res);
}

export async function setMyDefaultAddress(req: AuthRequest, res: Response): Promise<void> {
  await service.setMyDefaultAddress(req.user!.sub, req.params['addressId'] as string);
  sendNoContent(res);
}

// ─── Contact Preference handlers ──────────────────────────────────────────────

// GET  /api/v1/users/me/contact-preferences
export async function getMyContactPreferences(req: AuthRequest, res: Response): Promise<void> {
  const prefs = await service.getMyContactPreferences(req.user!.sub);
  sendSuccess(res, prefs);
}

// PATCH /api/v1/users/me/contact-preferences
export async function upsertMyContactPreferences(req: AuthRequest, res: Response): Promise<void> {
  const prefs = await service.upsertMyContactPreferences(req.user!.sub, req.body as UpdateContactPreferencesInput);
  sendSuccess(res, prefs, 'Contact preferences updated');
}

// ─── Review handlers ──────────────────────────────────────────────────────────

// GET  /api/v1/users/reviews  (admin)
export async function listReviews(req: Request, res: Response): Promise<void> {
  const result = await service.listReviews(req.query as unknown as ListReviewsInput);
  sendPaginated(res, result);
}

// GET  /api/v1/users/me/reviews
export async function listMyReviews(req: AuthRequest, res: Response): Promise<void> {
  const result = await service.listMyReviews(req.user!.sub, req.query as unknown as ListReviewsInput);
  sendPaginated(res, result);
}

// POST /api/v1/users/me/reviews
export async function createReview(req: AuthRequest, res: Response): Promise<void> {
  const review = await service.createReview(req.user!.sub, req.body as CreateReviewInput, ctxFromRequest(req, req.user!.sub));
  sendSuccess(res, review, 'Review submitted', 201);
}

// PATCH /api/v1/users/reviews/:reviewId/approve  (admin)
export async function approveReview(req: AuthRequest, res: Response): Promise<void> {
  const review = await service.approveReview(
    req.params['reviewId'] as string,
    ctxFromRequest(req, req.user?.sub),
  );
  sendSuccess(res, review, 'Review approved');
}

// DELETE /api/v1/users/reviews/:reviewId  (admin or owner)
export async function deleteReview(req: AuthRequest, res: Response): Promise<void> {
  const isAdmin = req.user!.role === 'admin';
  await service.deleteReview(
    req.params['reviewId'] as string,
    req.user!.sub,
    isAdmin,
    ctxFromRequest(req, req.user!.sub),
  );
  sendNoContent(res);
}

// ─── Payment Method Token handlers ────────────────────────────────────────────

// GET /api/v1/users/payment-methods  (admin)
export async function listAllPaymentMethods(req: AuthRequest, res: Response): Promise<void> {
  const result = await service.listAllPaymentMethods(req.query as unknown as ListPaymentMethodsInput);
  sendPaginated(res, result);
}

// DELETE /api/v1/users/payment-methods/:tokenId  (admin)
export async function adminDeletePaymentMethod(req: AuthRequest, res: Response): Promise<void> {
  await service.adminDeletePaymentMethod(
    req.params['tokenId'] as string,
    ctxFromRequest(req, req.user?.sub),
  );
  sendNoContent(res);
}

// GET /api/v1/users/me/payment-methods
export async function getMyPaymentMethods(req: AuthRequest, res: Response): Promise<void> {
  const tokens = await service.getMyPaymentMethods(req.user!.sub);
  sendSuccess(res, tokens);
}

// POST /api/v1/users/me/payment-methods
export async function addMyPaymentMethod(req: AuthRequest, res: Response): Promise<void> {
  const token = await service.addMyPaymentMethod(
    req.user!.sub,
    req.body as AddPaymentMethodInput,
    ctxFromRequest(req, req.user!.sub),
  );
  sendSuccess(res, token, 'Payment method saved', 201);
}

// PATCH /api/v1/users/me/payment-methods/:tokenId/default
export async function setMyDefaultPaymentMethod(req: AuthRequest, res: Response): Promise<void> {
  await service.setMyDefaultPaymentMethod(req.user!.sub, req.params['tokenId'] as string);
  sendNoContent(res);
}

// DELETE /api/v1/users/me/payment-methods/:tokenId
export async function removeMyPaymentMethod(req: AuthRequest, res: Response): Promise<void> {
  await service.removeMyPaymentMethod(
    req.user!.sub,
    req.params['tokenId'] as string,
    ctxFromRequest(req, req.user!.sub),
  );
  sendNoContent(res);
}

export async function listCountries(_req: Request, res: Response): Promise<void> {
  const countries = await service.listCountries();
  sendSuccess(res, countries);
}
