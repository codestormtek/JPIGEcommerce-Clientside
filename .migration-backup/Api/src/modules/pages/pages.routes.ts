import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import { listPagesSchema, createPageSchema, updatePageSchema } from './pages.schema';
import * as ctrl from './pages.controller';

export const pagesRouter = Router();

pagesRouter.get('/', authenticate, authorize('admin'), validate(listPagesSchema, 'query'), asyncHandler(ctrl.listPages));

pagesRouter.post('/', authenticate, authorize('admin'), validate(createPageSchema), asyncHandler(ctrl.createPage));

pagesRouter.get('/:id', authenticate, authorize('admin'), asyncHandler(ctrl.getPage));

pagesRouter.patch('/:id', authenticate, authorize('admin'), validate(updatePageSchema), asyncHandler(ctrl.updatePage));

pagesRouter.delete('/:id', authenticate, authorize('admin'), asyncHandler(ctrl.deletePage));
