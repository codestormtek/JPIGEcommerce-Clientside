import { ApiError } from '../../utils/apiError';
import {
  ListUsersInput, AdminUpdateUserInput, UpdateProfileInput, UpsertAddressInput,
  UpdateContactPreferencesInput, CreateReviewInput, ListReviewsInput,
  AddPaymentMethodInput, ListPaymentMethodsInput,
} from './users.schema';
import * as repo from './users.repository';
import { AuditContext, AuditAction, logAudit } from '../../utils/auditLogger';
import { sendAdminNewReviewNotification } from '../../lib/notificationEmails';
import prisma from '../../lib/prisma';

// ─── Admin operations ─────────────────────────────────────────────────────────

export async function listUsers(input: ListUsersInput) {
  return repo.findUsers(input);
}

export async function getUserById(id: string) {
  const user = await repo.findUserById(id);
  if (!user) throw ApiError.notFound('User');
  return user;
}

export async function adminUpdateUser(id: string, input: AdminUpdateUserInput, ctx?: AuditContext) {
  const before = await getUserById(id); // ensure exists + capture before state
  const after = await repo.updateUser(id, input);
  logAudit({
    action: AuditAction.USER_UPDATED,
    entityType: 'SiteUser',
    entityId: id,
    beforeJson: before,
    afterJson: after,
    ctx,
  });
  return after;
}

export async function deleteUser(id: string, ctx?: AuditContext): Promise<void> {
  await getUserById(id); // ensure exists
  await repo.softDeleteUser(id);
  logAudit({ action: AuditAction.USER_DELETED, entityType: 'SiteUser', entityId: id, ctx });
}

export async function getUserOrders(userId: string, page: number, limit: number) {
  await getUserById(userId);
  return repo.getUserOrdersByUserId(userId, page, limit);
}

export async function getUserAddresses(userId: string) {
  await getUserById(userId);
  return repo.getUserAddressesByUserId(userId);
}

export async function listAllAddresses(input: repo.ListAllAddressesInput) {
  return repo.listAllAddresses(input);
}

// ─── Self operations ──────────────────────────────────────────────────────────

export async function getMyProfile(userId: string) {
  const user = await repo.findUserById(userId);
  if (!user) throw ApiError.notFound('User');
  return user;
}

export async function updateMyProfile(userId: string, input: UpdateProfileInput) {
  return repo.updateUser(userId, input);
}

// ─── Address operations ───────────────────────────────────────────────────────

export async function getMyAddresses(userId: string) {
  return repo.getUserAddresses(userId);
}

export async function addMyAddress(userId: string, input: UpsertAddressInput) {
  return repo.addUserAddress(userId, input);
}

export async function removeMyAddress(userId: string, addressId: string): Promise<void> {
  const addresses = await repo.getUserAddresses(userId);
  const found = addresses.find((a: { id: string }) => a.id === addressId);
  if (!found) throw ApiError.notFound('Address');
  await repo.deleteUserAddress(userId, addressId);
}

export async function setMyDefaultAddress(userId: string, addressId: string): Promise<void> {
  const addresses = await repo.getUserAddresses(userId);
  const found = addresses.find((a: { id: string }) => a.id === addressId);
  if (!found) throw ApiError.notFound('Address');
  await repo.setDefaultAddress(userId, addressId);
}

// ─── Contact Preference operations ───────────────────────────────────────────

export async function getMyContactPreferences(userId: string) {
  const existing = await repo.getContactPreferences(userId);
  if (existing) return existing;
  // Auto-create with safe defaults on first access
  return repo.upsertContactPreferences(userId, { optInEmail: false, optInSms: false });
}

export async function upsertMyContactPreferences(userId: string, input: UpdateContactPreferencesInput) {
  return repo.upsertContactPreferences(userId, input);
}

// ─── Review operations ────────────────────────────────────────────────────────

export async function listReviews(input: ListReviewsInput) {
  return repo.findReviews(input);
}

export async function listMyReviews(userId: string, input: ListReviewsInput) {
  return repo.findMyReviews(userId, input);
}

export async function createReview(userId: string, input: CreateReviewInput, ctx?: AuditContext) {
  const review = await repo.createReview(userId, input);

  // Triggers: audit log + admin notification (fire-and-forget)
  logAudit({ action: AuditAction.REVIEW_SUBMITTED, entityType: 'UserReview', entityId: review.id, ctx });
  const [user, product] = await Promise.all([
    prisma.siteUser.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true, emailAddress: true } }),
    prisma.product.findUnique({ where: { id: input.productId }, select: { name: true } }),
  ]);
  const reviewerName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.emailAddress || 'Anonymous';
  sendAdminNewReviewNotification({
    reviewerName,
    productName: product?.name ?? 'Unknown Product',
    productId: input.productId,
    ratingValue: input.ratingValue,
    comment: input.comment,
  }).catch(() => {});

  return review;
}

export async function approveReview(id: string, ctx?: AuditContext) {
  const review = await repo.findReviewById(id);
  if (!review) throw ApiError.notFound('Review');
  const result = await repo.approveReview(id);
  logAudit({ action: AuditAction.REVIEW_APPROVED, entityType: 'UserReview', entityId: id, ctx });
  return result;
}

export async function deleteReview(id: string, requestingUserId: string, isAdmin: boolean, ctx?: AuditContext) {
  const review = await repo.findReviewById(id);
  if (!review) throw ApiError.notFound('Review');
  if (!isAdmin && review.userId !== requestingUserId) throw ApiError.forbidden('Cannot delete another user\'s review');
  const result = await repo.deleteReview(id);
  logAudit({ action: AuditAction.REVIEW_DELETED, entityType: 'UserReview', entityId: id, ctx });
  return result;
}

// ─── Payment Method Token operations ─────────────────────────────────────────

export async function listAllPaymentMethods(input: ListPaymentMethodsInput) {
  return repo.listAllPaymentMethods(input);
}

export async function adminDeletePaymentMethod(tokenId: string, ctx?: AuditContext): Promise<void> {
  await repo.deletePaymentMethod(tokenId);
  logAudit({ action: AuditAction.PAYMENT_METHOD_REMOVED, entityType: 'PaymentMethodToken', entityId: tokenId, ctx });
}

export async function getMyPaymentMethods(userId: string) {
  return repo.getPaymentMethods(userId);
}

export async function addMyPaymentMethod(userId: string, input: AddPaymentMethodInput, ctx?: AuditContext) {
  const token = await repo.addPaymentMethod(userId, input);
  logAudit({ action: AuditAction.PAYMENT_METHOD_ADDED, entityType: 'PaymentMethodToken', entityId: token.id, ctx });
  return token;
}

export async function setMyDefaultPaymentMethod(userId: string, tokenId: string): Promise<void> {
  const token = await repo.findPaymentMethodById(tokenId, userId);
  if (!token) throw ApiError.notFound('Payment method');
  await repo.setDefaultPaymentMethod(userId, tokenId);
}

export async function removeMyPaymentMethod(userId: string, tokenId: string, ctx?: AuditContext): Promise<void> {
  const token = await repo.findPaymentMethodById(tokenId, userId);
  if (!token) throw ApiError.notFound('Payment method');
  await repo.deletePaymentMethod(tokenId);
  logAudit({ action: AuditAction.PAYMENT_METHOD_REMOVED, entityType: 'PaymentMethodToken', entityId: tokenId, ctx });
}

export async function listCountries() {
  return repo.findAllCountries();
}

