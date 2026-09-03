import { Response } from 'express';
import { AuthRequest } from '../../types';
import { sendSuccess, sendPaginated, sendNoContent } from '../../utils/apiResponse';
import { ListReviewsInput, ListCommentsInput, UpdateReviewApproval } from './reviews.schema';
import * as service from './reviews.service';

// ─── Product Reviews ──────────────────────────────────────────────────────────

export async function listReviews(req: AuthRequest, res: Response): Promise<void> {
  const result = await service.listReviews(req.query as unknown as ListReviewsInput);
  sendPaginated(res, result);
}

export async function getReview(req: AuthRequest, res: Response): Promise<void> {
  const review = await service.getReviewById(req.params['id'] as string);
  sendSuccess(res, review);
}

export async function updateApproval(req: AuthRequest, res: Response): Promise<void> {
  const review = await service.updateReviewApproval(
    req.params['id'] as string,
    req.body as UpdateReviewApproval,
  );
  sendSuccess(res, review, `Review ${review.isApproved ? 'approved' : 'disapproved'} successfully`);
}

export async function deleteReview(req: AuthRequest, res: Response): Promise<void> {
  await service.deleteReview(req.params['id'] as string);
  sendNoContent(res);
}

// ─── Blog Comments ────────────────────────────────────────────────────────────

export async function listComments(req: AuthRequest, res: Response): Promise<void> {
  const result = await service.listComments(req.query as unknown as ListCommentsInput);
  sendPaginated(res, result);
}

export async function getComment(req: AuthRequest, res: Response): Promise<void> {
  const comment = await service.getCommentById(req.params['id'] as string);
  sendSuccess(res, comment);
}

export async function updateCommentApproval(req: AuthRequest, res: Response): Promise<void> {
  const comment = await service.updateCommentApproval(
    req.params['id'] as string,
    req.body as UpdateReviewApproval,
  );
  sendSuccess(res, comment, `Comment ${comment.isApproved ? 'approved' : 'disapproved'} successfully`);
}

export async function deleteComment(req: AuthRequest, res: Response): Promise<void> {
  await service.deleteComment(req.params['id'] as string);
  sendNoContent(res);
}
