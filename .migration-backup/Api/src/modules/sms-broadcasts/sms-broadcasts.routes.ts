import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import * as ctrl from './sms-broadcasts.controller';
import {
  listBroadcastsSchema,
  previewAudienceSchema,
  sendBroadcastSchema,
} from './sms-broadcasts.schema';

export const smsBroadcastsRouter = Router();

smsBroadcastsRouter.use(authenticate, authorize('admin'));

smsBroadcastsRouter.get('/topics', asyncHandler(ctrl.getTopics));
smsBroadcastsRouter.get('/audience/preview', validate(previewAudienceSchema, 'query'), asyncHandler(ctrl.previewAudience));
smsBroadcastsRouter.get('/', validate(listBroadcastsSchema, 'query'), asyncHandler(ctrl.listBroadcasts));
smsBroadcastsRouter.get('/:id', asyncHandler(ctrl.getBroadcast));
smsBroadcastsRouter.post('/', validate(sendBroadcastSchema), asyncHandler(ctrl.sendBroadcast));
