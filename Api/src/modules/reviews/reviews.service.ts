import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/apiError';
import { PaginatedResult } from '../../types';
import { ListReviewsInput, UpdateReviewApproval } from './reviews.schema';

export async function listReviews(input: ListReviewsInput): Promise<PaginatedResult<any>> {
  const { page, limit, approved, productId, search, sort } = input;
  const skip = (page - 1) * limit;

  const where: any = {};

  if (approved === 'true')  where.isApproved = true;
  if (approved === 'false') where.isApproved = false;
  if (productId) where.productId = productId;

  if (search) {
    where.OR = [
      { comment: { contains: search, mode: 'insensitive' } },
      { user: { firstName: { contains: search, mode: 'insensitive' } } },
      { user: { lastName:  { contains: search, mode: 'insensitive' } } },
      { user: { emailAddress: { contains: search, mode: 'insensitive' } } },
      { product: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.userReview.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: sort },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, emailAddress: true },
        },
        product: {
          select: { id: true, name: true },
        },
      },
    }),
    prisma.userReview.count({ where }),
  ]);

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getReviewById(id: string) {
  const review = await prisma.userReview.findUnique({
    where: { id },
    include: {
      user:    { select: { id: true, firstName: true, lastName: true, emailAddress: true } },
      product: { select: { id: true, name: true } },
    },
  });
  if (!review) throw ApiError.notFound('Review not found');
  return review;
}

export async function updateReviewApproval(id: string, input: UpdateReviewApproval) {
  const existing = await prisma.userReview.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Review not found');

  return prisma.userReview.update({
    where: { id },
    data:  { isApproved: input.isApproved },
    include: {
      user:    { select: { id: true, firstName: true, lastName: true, emailAddress: true } },
      product: { select: { id: true, name: true } },
    },
  });
}

export async function deleteReview(id: string) {
  const existing = await prisma.userReview.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Review not found');
  await prisma.userReview.delete({ where: { id } });
}
