import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import { listWidgetsSchema, createWidgetSchema, updateWidgetSchema, createWidgetItemSchema, updateWidgetItemSchema } from './widgets.schema';
import * as ctrl from './widgets.controller';

export const widgetsRouter = Router();

widgetsRouter.get('/public/:placement', asyncHandler(ctrl.getPublicWidget));

widgetsRouter.get('/', authenticate, authorize('admin'), validate(listWidgetsSchema, 'query'), asyncHandler(ctrl.listWidgets));
widgetsRouter.get('/:id', authenticate, authorize('admin'), asyncHandler(ctrl.getWidgetById));
widgetsRouter.post('/', authenticate, authorize('admin'), validate(createWidgetSchema), asyncHandler(ctrl.createWidget));
widgetsRouter.patch('/:id', authenticate, authorize('admin'), validate(updateWidgetSchema), asyncHandler(ctrl.updateWidget));
widgetsRouter.delete('/:id', authenticate, authorize('admin'), asyncHandler(ctrl.deleteWidget));

widgetsRouter.post('/:id/items', authenticate, authorize('admin'), validate(createWidgetItemSchema), asyncHandler(ctrl.createWidgetItem));
widgetsRouter.patch('/:id/items/:itemId', authenticate, authorize('admin'), validate(updateWidgetItemSchema), asyncHandler(ctrl.updateWidgetItem));
widgetsRouter.delete('/:id/items/:itemId', authenticate, authorize('admin'), asyncHandler(ctrl.deleteWidgetItem));
