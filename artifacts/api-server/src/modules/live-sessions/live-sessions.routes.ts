import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import * as ctrl from './live-sessions.controller';
import {
  createLiveSessionSchema,
  updateLiveSessionSchema,
  listLiveSessionsSchema,
  goLiveSchema,
  sendAlertSchema,
  testSmsSchema,
  alertHistorySchema,
  publicSubscribeSchema,
  publicUnsubscribeSchema,
} from './live-sessions.schema';

export const liveSessionsRouter = Router();

liveSessionsRouter.get('/public/current', asyncHandler(ctrl.publicGetCurrent));
liveSessionsRouter.post('/public/subscribe', validate(publicSubscribeSchema), asyncHandler(ctrl.publicSubscribe));
liveSessionsRouter.post('/public/unsubscribe', validate(publicUnsubscribeSchema), asyncHandler(ctrl.publicUnsubscribe));

liveSessionsRouter.get('/alerts/history', authenticate, authorize('admin'), validate(alertHistorySchema, 'query'), asyncHandler(ctrl.alertHistory));
liveSessionsRouter.get('/subscribers/count', authenticate, authorize('admin'), asyncHandler(ctrl.subscriberCount));

// POST /api/v1/live-sessions/sms/test — standalone SMS test (no session required)
liveSessionsRouter.post('/sms/test', authenticate, authorize('admin'), validate(testSmsSchema), asyncHandler(ctrl.testSms));

liveSessionsRouter.post('/', authenticate, authorize('admin'), validate(createLiveSessionSchema), asyncHandler(ctrl.createSession));
liveSessionsRouter.get('/', authenticate, authorize('admin'), validate(listLiveSessionsSchema, 'query'), asyncHandler(ctrl.listSessions));
liveSessionsRouter.get('/:id', authenticate, authorize('admin'), asyncHandler(ctrl.getSession));
liveSessionsRouter.patch('/:id', authenticate, authorize('admin'), validate(updateLiveSessionSchema), asyncHandler(ctrl.updateSession));
liveSessionsRouter.delete('/:id', authenticate, authorize('admin'), asyncHandler(ctrl.deleteSession));
liveSessionsRouter.post('/:id/go-live', authenticate, authorize('admin'), validate(goLiveSchema), asyncHandler(ctrl.goLive));
liveSessionsRouter.post('/:id/close', authenticate, authorize('admin'), asyncHandler(ctrl.closeSession));
liveSessionsRouter.post('/:id/send-alert', authenticate, authorize('admin'), validate(sendAlertSchema), asyncHandler(ctrl.sendAlert));
liveSessionsRouter.post('/:id/test-sms', authenticate, authorize('admin'), validate(testSmsSchema), asyncHandler(ctrl.testSms));
