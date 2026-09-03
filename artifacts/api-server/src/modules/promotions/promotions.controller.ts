import { Request, Response } from 'express';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from '../../utils/apiResponse';
import {
  ListPromotionsInput,
  CreatePromotionInput,
  UpdatePromotionInput,
  CreateCouponInput,
  ValidateCouponInput,
  ListPromotionUsagesInput,
} from './promotions.schema';
import * as service from './promotions.service';

// ─── Promotions ───────────────────────────────────────────────────────────────

export async function listPromotions(req: Request, res: Response): Promise<void> {
  const result = await service.listPromotions(req.query as unknown as ListPromotionsInput);
  sendPaginated(res, result);
}

export async function getPromotionById(req: Request, res: Response): Promise<void> {
  const promo = await service.getPromotionById(req.params['id'] as string);
  sendSuccess(res, promo);
}

export async function createPromotion(req: Request, res: Response): Promise<void> {
  const promo = await service.createPromotion(req.body as CreatePromotionInput);
  sendCreated(res, promo, 'Promotion created');
}

export async function updatePromotion(req: Request, res: Response): Promise<void> {
  const promo = await service.updatePromotion(req.params['id'] as string, req.body as UpdatePromotionInput);
  sendSuccess(res, promo, 'Promotion updated');
}

export async function deletePromotion(req: Request, res: Response): Promise<void> {
  await service.deletePromotion(req.params['id'] as string);
  sendNoContent(res);
}

// ─── Coupons ──────────────────────────────────────────────────────────────────

export async function addCoupon(req: Request, res: Response): Promise<void> {
  const coupon = await service.addCoupon(req.params['id'] as string, req.body as CreateCouponInput);
  sendCreated(res, coupon, 'Coupon added');
}

export async function removeCoupon(req: Request, res: Response): Promise<void> {
  await service.removeCoupon(req.params['couponId'] as string);
  sendNoContent(res);
}

// ─── Coupon validation (public) ───────────────────────────────────────────────

export async function validateCoupon(req: Request, res: Response): Promise<void> {
  const result = await service.validateCoupon(req.body as ValidateCouponInput);
  sendSuccess(res, result);
}

// ─── Promotion usages (admin) ─────────────────────────────────────────────────

export async function listPromotionUsages(req: Request, res: Response): Promise<void> {
  const result = await service.getPromotionUsages(
    req.params['id'] as string,
    req.query as unknown as ListPromotionUsagesInput,
  );
  sendPaginated(res, result);
}

