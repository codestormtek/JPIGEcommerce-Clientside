import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  createSocialLinkSchema,
  updateSocialLinkSchema,
  reorderSocialLinksSchema,
} from './social-links.schema';
import * as ctrl from './social-links.controller';

export const socialLinksRouter = Router();

socialLinksRouter.get('/public', asyncHandler(ctrl.getPublicLinks));

socialLinksRouter.get('/', authenticate, authorize('admin'), asyncHandler(ctrl.getAllLinks));
socialLinksRouter.post('/', authenticate, authorize('admin'), validate(createSocialLinkSchema), asyncHandler(ctrl.createLink));
socialLinksRouter.put('/reorder', authenticate, authorize('admin'), validate(reorderSocialLinksSchema), asyncHandler(ctrl.reorderLinks));
socialLinksRouter.patch('/:id', authenticate, authorize('admin'), validate(updateSocialLinkSchema), asyncHandler(ctrl.updateLink));
socialLinksRouter.delete('/:id', authenticate, authorize('admin'), asyncHandler(ctrl.deleteLink));
