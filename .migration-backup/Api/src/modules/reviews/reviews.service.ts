import prisma from '../../lib/prisma';
import { ApiError } from '../../utils/apiError';
import { PaginatedResult } from '../../types';
import { ListReviewsInput, ListCommentsInput, UpdateReviewApproval } from './reviews.schema';

// ─── Product Reviews ──────────────────────────────────────────────────────────

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
      { user: { firstName:    { contains: search, mode: 'insensitive' } } },
      { user: { lastName:     { contains: search, mode: 'insensitive' } } },
      { user: { emailAddress: { contains: search, mode: 'insensitive' } } },
      { product: { name:      { contains: search, mode: 'insensitive' } } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.userReview.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: sort },
      include: {
        user:    { select: { id: true, firstName: true, lastName: true, emailAddress: true } },
        product: { select: { id: true, name: true } },
      },
    }),
    prisma.userReview.count({ where }),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
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

// ─── Blog Comments ────────────────────────────────────────────────────────────

export async function listComments(input: ListCommentsInput): Promise<PaginatedResult<any>> {
  const { page, limit, approved, postId, search, sort } = input;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (approved === 'true')  where.isApproved = true;
  if (approved === 'false') where.isApproved = false;
  if (postId) where.postId = postId;
  if (search) {
    where.OR = [
      { body: { contains: search, mode: 'insensitive' } },
      { user: { firstName:    { contains: search, mode: 'insensitive' } } },
      { user: { lastName:     { contains: search, mode: 'insensitive' } } },
      { user: { emailAddress: { contains: search, mode: 'insensitive' } } },
      { post: { title:        { contains: search, mode: 'insensitive' } } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.contentComment.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: sort },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, emailAddress: true } },
        post: { select: { id: true, title: true, slug: true, postType: true } },
        parent: { select: { id: true, body: true } },
      },
    }),
    prisma.contentComment.count({ where }),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getCommentById(id: string) {
  const comment = await prisma.contentComment.findUnique({
    where: { id },
    include: {
      user:   { select: { id: true, firstName: true, lastName: true, emailAddress: true } },
      post:   { select: { id: true, title: true, slug: true, postType: true } },
      parent: { select: { id: true, body: true } },
    },
  });
  if (!comment) throw ApiError.notFound('Comment not found');
  return comment;
}

export async function updateCommentApproval(id: string, input: UpdateReviewApproval) {
  const existing = await prisma.contentComment.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Comment not found');
  return prisma.contentComment.update({
    where: { id },
    data:  { isApproved: input.isApproved },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, emailAddress: true } },
      post: { select: { id: true, title: true, slug: true, postType: true } },
    },
  });
}

export async function deleteComment(id: string) {
  const existing = await prisma.contentComment.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Comment not found');
  await prisma.contentComment.delete({ where: { id } });
}
