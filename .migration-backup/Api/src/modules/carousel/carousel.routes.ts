import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import { listSlidesSchema, createSlideSchema, updateSlideSchema } from './carousel.schema';
import * as ctrl from './carousel.controller';

export const carouselRouter = Router();

// GET  /api/v1/carousel/public  — public (no auth): visible slides ordered
carouselRouter.get('/public', asyncHandler(ctrl.getPublicSlides));

// GET  /api/v1/carousel          — admin: paginated list
carouselRouter.get('/', authenticate, authorize('admin'), validate(listSlidesSchema, 'query'), asyncHandler(ctrl.listSlides));

// GET  /api/v1/carousel/:id      — admin: single slide
carouselRouter.get('/:id', authenticate, authorize('admin'), asyncHandler(ctrl.getSlideById));

// POST /api/v1/carousel          — admin: create
carouselRouter.post('/', authenticate, authorize('admin'), validate(createSlideSchema), asyncHandler(ctrl.createSlide));

// PATCH /api/v1/carousel/:id     — admin: update
carouselRouter.patch('/:id', authenticate, authorize('admin'), validate(updateSlideSchema), asyncHandler(ctrl.updateSlide));

// DELETE /api/v1/carousel/:id    — admin: soft-delete
carouselRouter.delete('/:id', authenticate, authorize('admin'), asyncHandler(ctrl.deleteSlide));

