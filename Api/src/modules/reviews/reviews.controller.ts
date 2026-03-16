import { Response } from 'express';
import { AuthRequest } from '../../types';
import { sendSuccess, sendPaginated, sendNoContent } from '../../utils/apiResponse';
import { ListReviewsInput, UpdateReviewApproval } from './reviews.schema';
import * as service from './reviews.service';

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
