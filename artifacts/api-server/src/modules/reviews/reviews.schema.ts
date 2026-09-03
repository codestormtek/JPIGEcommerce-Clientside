import { z } from 'zod';

export const listReviewsSchema = z.object({
  page:       z.coerce.number().int().positive().default(1),
  limit:      z.coerce.number().int().min(1).max(100).default(20),
  approved:   z.enum(['true', 'false', 'all']).optional().default('all'),
  productId:  z.string().uuid().optional(),
  search:     z.string().optional(),
  sort:       z.enum(['asc', 'desc']).optional().default('desc'),
});

export const listCommentsSchema = z.object({
  page:     z.coerce.number().int().positive().default(1),
  limit:    z.coerce.number().int().min(1).max(100).default(20),
  approved: z.enum(['true', 'false', 'all']).optional().default('all'),
  postId:   z.string().uuid().optional(),
  search:   z.string().optional(),
  sort:     z.enum(['asc', 'desc']).optional().default('desc'),
});

export const updateReviewApprovalSchema = z.object({
  isApproved: z.boolean(),
});

export type ListReviewsInput     = z.infer<typeof listReviewsSchema>;
export type ListCommentsInput    = z.infer<typeof listCommentsSchema>;
export type UpdateReviewApproval = z.infer<typeof updateReviewApprovalSchema>;
