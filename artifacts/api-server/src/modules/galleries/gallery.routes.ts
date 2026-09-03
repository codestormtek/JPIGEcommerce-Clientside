import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  listGalleriesSchema,
  createGallerySchema,
  updateGallerySchema,
  addGalleryImageSchema,
  updateGalleryImageSchema,
} from './gallery.schema';
import * as ctrl from './gallery.controller';

export const galleryRouter = Router();

galleryRouter.get('/public',       asyncHandler(ctrl.getPublicGalleries));
galleryRouter.get('/public/:slug', asyncHandler(ctrl.getPublicGalleryBySlug));

galleryRouter.get('/',    authenticate, authorize('admin'), validate(listGalleriesSchema, 'query'), asyncHandler(ctrl.listGalleries));
galleryRouter.get('/:id', authenticate, authorize('admin'), asyncHandler(ctrl.getGalleryById));
galleryRouter.post('/',   authenticate, authorize('admin'), validate(createGallerySchema), asyncHandler(ctrl.createGallery));
galleryRouter.patch('/:id',  authenticate, authorize('admin'), validate(updateGallerySchema), asyncHandler(ctrl.updateGallery));
galleryRouter.delete('/:id', authenticate, authorize('admin'), asyncHandler(ctrl.deleteGallery));

galleryRouter.post('/:id/images',            authenticate, authorize('admin'), validate(addGalleryImageSchema), asyncHandler(ctrl.addImage));
galleryRouter.patch('/:id/images/:imageId',  authenticate, authorize('admin'), validate(updateGalleryImageSchema), asyncHandler(ctrl.updateImage));
galleryRouter.delete('/:id/images/:imageId', authenticate, authorize('admin'), asyncHandler(ctrl.removeImage));
