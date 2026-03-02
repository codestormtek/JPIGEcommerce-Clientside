import { ApiError } from '../../utils/apiError';
import {
  ListPromotionsInput,
  CreatePromotionInput,
  UpdatePromotionInput,
  CreateCouponInput,
  ValidateCouponInput,
  ListPromotionUsagesInput,
} from './promotions.schema';
import * as repo from './promotions.repository';

// ─── Promotions ───────────────────────────────────────────────────────────────

export async function listPromotions(input: ListPromotionsInput) {
  return repo.findPromotions(input);
}

export async function getPromotionById(id: string) {
  const promo = await repo.findPromotionById(id);
  if (!promo) throw ApiError.notFound('Promotion');
  return promo;
}

export async function createPromotion(input: CreatePromotionInput) {
  return repo.createPromotion(input);
}

export async function updatePromotion(id: string, input: UpdatePromotionInput) {
  await getPromotionById(id);
  return repo.updatePromotion(id, input);
}

export async function deletePromotion(id: string) {
  await getPromotionById(id);
  return repo.deletePromotion(id);
}

// ─── Coupons ──────────────────────────────────────────────────────────────────

export async function addCoupon(promotionId: string, input: CreateCouponInput) {
  await getPromotionById(promotionId);
  return repo.createCoupon(promotionId, input);
}

export async function removeCoupon(couponId: string) {
  return repo.deleteCoupon(couponId);
}

// ─── Validate coupon ──────────────────────────────────────────────────────────

export async function validateCoupon(input: ValidateCouponInput) {
  const coupon = await repo.findCouponByCode(input.code);
  if (!coupon) throw ApiError.notFound('Coupon');

  // Check expiry
  if (coupon.expirationDate && coupon.expirationDate < new Date()) {
    throw ApiError.unprocessable('Coupon has expired');
  }

  // Check usage limit
  if (coupon.usageLimit !== null && coupon.timesUsed >= coupon.usageLimit) {
    throw ApiError.unprocessable('Coupon usage limit has been reached');
  }

  // Check minimum subtotal
  if (coupon.promotion?.minSubtotal && input.subtotal !== undefined) {
    if (input.subtotal < Number(coupon.promotion.minSubtotal)) {
      throw ApiError.unprocessable(
        `Minimum subtotal of ${coupon.promotion.minSubtotal} required for this coupon`,
      );
    }
  }

  // Calculate discount
  let discountAmount = Number(coupon.discountAmount);
  if (coupon.percentage && input.subtotal !== undefined) {
    discountAmount = (Number(coupon.percentage) / 100) * input.subtotal;
  }

  return {
    valid: true,
    code: coupon.code,
    discountAmount,
    percentage: coupon.percentage ? Number(coupon.percentage) : null,
    promotion: coupon.promotion ?? null,
  };
}

// ─── Promotion Usages (admin) ─────────────────────────────────────────────────

export async function getPromotionUsages(promotionId: string, input: ListPromotionUsagesInput) {
  await getPromotionById(promotionId); // throws 404 if not found
  return repo.findPromotionUsages(promotionId, input);
}

// ─── Coupon redemption (called after order is created) ────────────────────────

export async function redeemCoupon(code: string, orderId: string, userId: string) {
  const coupon = await repo.findCouponByCode(code);
  if (!coupon) return; // silently skip — coupon was already validated before order was placed
  if (coupon.promotionId) {
    await repo.recordPromotionUsage(coupon.promotionId, orderId, userId);
  }
  await repo.incrementCouponUsage(coupon.id);
}

