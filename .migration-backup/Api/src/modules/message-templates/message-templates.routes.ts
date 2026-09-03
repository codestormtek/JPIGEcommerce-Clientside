import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  listMessageTemplatesSchema,
  createMessageTemplateSchema,
  updateMessageTemplateSchema,
  testMessageTemplateSchema,
} from './message-templates.schema';
import * as ctrl from './message-templates.controller';

export const messageTemplatesRouter = Router();

// All message template routes are admin-only
messageTemplatesRouter.use(authenticate, authorize('admin'));

// GET    /api/v1/message-templates
messageTemplatesRouter.get(
  '/',
  validate(listMessageTemplatesSchema, 'query'),
  asyncHandler(ctrl.listMessageTemplates),
);

// POST   /api/v1/message-templates
messageTemplatesRouter.post(
  '/',
  validate(createMessageTemplateSchema),
  asyncHandler(ctrl.createMessageTemplate),
);

// POST   /api/v1/message-templates/:id/test   (must be before /:id)
messageTemplatesRouter.post(
  '/:id/test',
  validate(testMessageTemplateSchema),
  asyncHandler(ctrl.testMessageTemplate),
);

// GET    /api/v1/message-templates/:id
messageTemplatesRouter.get('/:id', asyncHandler(ctrl.getMessageTemplateById));

// PATCH  /api/v1/message-templates/:id
messageTemplatesRouter.patch(
  '/:id',
  validate(updateMessageTemplateSchema),
  asyncHandler(ctrl.updateMessageTemplate),
);

// DELETE /api/v1/message-templates/:id
messageTemplatesRouter.delete('/:id', asyncHandler(ctrl.deleteMessageTemplate));

