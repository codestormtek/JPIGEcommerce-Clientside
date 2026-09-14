import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import { validate } from '../../middleware/validate.middleware';
import * as controller from './cloudprnt.controller';
import {
  cloudPrntCompletionQuerySchema, cloudPrntJobQuerySchema, cloudPrntSettingsSchema, createPrinterSchema, printerIdSchema, printerJobParamsSchema, printerPollSchema, updatePrinterSchema,
} from './cloudprnt.schema';

export const cloudPrntRouter = Router();

const pollLimiter = rateLimit({
  windowMs: 60_000, max: 240, standardHeaders: true, legacyHeaders: false,
  keyGenerator: (req) => crypto.createHash('sha256').update(req.header('authorization') ?? req.ip ?? 'unknown').digest('hex'),
});

// Star CloudPRNT HTTP uses one configured URL. The printer POSTs its poll to
// it, GETs the current job from it, then DELETEs that job to confirm completion.
// These routes intentionally use printer Basic credentials rather than admin JWTs.
cloudPrntRouter.post('/', pollLimiter, validate(printerPollSchema), asyncHandler(controller.poll));
cloudPrntRouter.get('/', pollLimiter, validate(cloudPrntJobQuerySchema, 'query'), asyncHandler(controller.fetch));
cloudPrntRouter.delete('/', pollLimiter, validate(cloudPrntCompletionQuerySchema, 'query'), asyncHandler(controller.complete));

cloudPrntRouter.use(authenticate, authorize('admin'));
cloudPrntRouter.get('/settings', asyncHandler(controller.getSettings));
cloudPrntRouter.put('/settings', validate(cloudPrntSettingsSchema), asyncHandler(controller.saveSettings));
cloudPrntRouter.get('/printers', asyncHandler(controller.list));
cloudPrntRouter.post('/printers', validate(createPrinterSchema), asyncHandler(controller.create));
cloudPrntRouter.patch('/printers/:printerId', validate(printerIdSchema, 'params'), validate(updatePrinterSchema), asyncHandler(controller.update));
cloudPrntRouter.get('/printers/:printerId/jobs', validate(printerIdSchema, 'params'), asyncHandler(controller.jobs));
cloudPrntRouter.post('/printers/:printerId/test-ticket', validate(printerIdSchema, 'params'), asyncHandler(controller.testTicket));
cloudPrntRouter.post('/printers/:printerId/jobs/:jobId/reprint', validate(printerJobParamsSchema, 'params'), asyncHandler(controller.reprint));