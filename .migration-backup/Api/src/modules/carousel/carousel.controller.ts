import { Request, Response } from 'express';
import { AuthRequest } from '../../types';
import { sendSuccess, sendCreated, sendNoContent } from '../../utils/apiResponse';
import type { ListSlidesInput, CreateSlideInput, UpdateSlideInput } from './carousel.schema';
import * as service from './carousel.service';

// GET /api/v1/carousel/public — public list (visible slides, ordered)
export async function getPublicSlides(_req: Request, res: Response): Promise<void> {
  const slides = await service.getPublicSlides();
  sendSuccess(res, slides);
}

// GET /api/v1/carousel — admin paginated list
export async function listSlides(req: Request, res: Response): Promise<void> {
  const result = await service.listSlides(req.query as unknown as ListSlidesInput);
  res.status(200).json({
    success: true,
    data: result.data,
    meta: {
      total:      result.total,
      page:       result.page,
      limit:      result.limit,
      totalPages: result.totalPages,
    },
  });
}

// GET /api/v1/carousel/:id
export async function getSlideById(req: Request, res: Response): Promise<void> {
  const slide = await service.getSlideById(req.params['id'] as string);
  sendSuccess(res, slide);
}

// POST /api/v1/carousel
export async function createSlide(req: AuthRequest, res: Response): Promise<void> {
  const slide = await service.createSlide(req.body as CreateSlideInput);
  sendCreated(res, slide, 'Carousel slide created');
}

// PATCH /api/v1/carousel/:id
export async function updateSlide(req: AuthRequest, res: Response): Promise<void> {
  const slide = await service.updateSlide(req.params['id'] as string, req.body as UpdateSlideInput);
  sendSuccess(res, slide, 'Carousel slide updated');
}

// DELETE /api/v1/carousel/:id
export async function deleteSlide(req: AuthRequest, res: Response): Promise<void> {
  await service.deleteSlide(req.params['id'] as string);
  sendNoContent(res);
}

