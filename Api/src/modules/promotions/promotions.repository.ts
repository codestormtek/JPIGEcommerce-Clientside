import prisma from '../../lib/prisma';
import {
  ListPromotionsInput,
  CreatePromotionInput,
  UpdatePromotionInput,
  CreateCouponInput,
  ListPromotionUsagesInput,
} from './promotions.schema';

type TxClient = Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

const promotionInclude = {
  coupons: true,
  categories: { include: { category: true } },
  products: { include: { product: true } },
} as const;

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function findPromotions(input: ListPromotionsInput) {
  const { page, limit, promotionType, isActive, orderBy, order } = input;
  const skip = (page - 1) * limit;
  const where: Record<string, unknown> = {};
  if (promotionType) where['promotionType'] = promotionType;
  if (isActive !== undefined) where['isActive'] = isActive;

  const [data, total] = await Promise.all([
    prisma.promotion.findMany({ where, include: promotionInclude, orderBy: { [orderBy]: order }, skip, take: limit }),
    prisma.promotion.count({ where }),
  ]);
  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function findPromotionById(id: string) {
  return prisma.promotion.findUnique({ where: { id }, include: promotionInclude });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createPromotion(input: CreatePromotionInput) {
  const { categoryIds, productIds, ...data } = input;
  return prisma.$transaction(async (tx: TxClient) => {
    const promo = await tx.promotion.create({ data, include: promotionInclude });
    if (categoryIds?.length) {
      await tx.promotionCategory.createMany({
        data: categoryIds.map((categoryId) => ({ promotionId: promo.id, categoryId })),
      });
    }
    if (productIds?.length) {
      await tx.promotionProduct.createMany({
        data: productIds.map((productId) => ({ promotionId: promo.id, productId })),
      });
    }
    return tx.promotion.findUnique({ where: { id: promo.id }, include: promotionInclude });
  });
}

export async function updatePromotion(id: string, input: UpdatePromotionInput) {
  const { categoryIds, productIds, ...data } = input;
  return prisma.$transaction(async (tx: TxClient) => {
    if (categoryIds !== undefined) {
      await tx.promotionCategory.deleteMany({ where: { promotionId: id } });
      if (categoryIds.length) {
        await tx.promotionCategory.createMany({
          data: categoryIds.map((categoryId) => ({ promotionId: id, categoryId })),
        });
      }
    }
    if (productIds !== undefined) {
      await tx.promotionProduct.deleteMany({ where: { promotionId: id } });
      if (productIds.length) {
        await tx.promotionProduct.createMany({
          data: productIds.map((productId) => ({ promotionId: id, productId })),
        });
      }
    }
    return tx.promotion.update({ where: { id }, data, include: promotionInclude });
  });
}

export async function deletePromotion(id: string) {
  return prisma.promotion.delete({ where: { id } });
}

// ─── Coupons ──────────────────────────────────────────────────────────────────

export async function createCoupon(promotionId: string, input: CreateCouponInput) {
  return prisma.coupon.create({ data: { ...input, promotionId } });
}

export async function deleteCoupon(couponId: string) {
  return prisma.coupon.delete({ where: { id: couponId } });
}

export async function findCouponByCode(code: string) {
  return prisma.coupon.findFirst({
    where: { code: code.toUpperCase(), isDeleted: false },
    include: { promotion: true },
  });
}

// ─── Promotion Usages ─────────────────────────────────────────────────────────

export async function findPromotionUsages(promotionId: string, input: ListPromotionUsagesInput) {
  const { page, limit, from, to, order } = input;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { promotionId };
  if (from || to) {
    where['usedAt'] = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }

  const [data, total] = await Promise.all([
    prisma.promotionUsage.findMany({
      where,
      include: {
        order: { select: { id: true, orderDate: true, grandTotal: true } },
        user: { select: { id: true, emailAddress: true } },
      },
      orderBy: { usedAt: order },
      skip,
      take: limit,
    }),
    prisma.promotionUsage.count({ where }),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function recordPromotionUsage(promotionId: string, orderId: string, userId: string) {
  return prisma.promotionUsage.create({
    data: { promotionId, orderId, userId, usedAt: new Date() },
  });
}

export async function incrementCouponUsage(couponId: string) {
  return prisma.coupon.update({
    where: { id: couponId },
    data: { timesUsed: { increment: 1 } },
  });
}

