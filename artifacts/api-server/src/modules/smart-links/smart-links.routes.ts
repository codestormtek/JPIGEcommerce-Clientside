import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import { validate } from '../../middleware/validate.middleware';
import * as controller from './smart-links.controller';
import { createSmartLinkSchema, publicSlugSchema, smartLinkConfigSchema, smartLinkIdSchema, updateSmartLinkSchema } from './smart-links.schema';

export const smartLinksRouter = Router();
export const smartLinksPublicRouter = Router();

smartLinksPublicRouter.get('/resolve/:slug', validate(publicSlugSchema, 'params'), asyncHandler(controller.relayResolve));
smartLinksPublicRouter.get('/:slug', validate(publicSlugSchema, 'params'), asyncHandler(controller.redirect));

smartLinksRouter.use(authenticate, authorize('admin'));
smartLinksRouter.get('/config', asyncHandler(controller.getConfig));
smartLinksRouter.put('/config', validate(smartLinkConfigSchema), asyncHandler(controller.updateConfig));
smartLinksRouter.get('/', asyncHandler(controller.list));
smartLinksRouter.post('/', validate(createSmartLinkSchema), asyncHandler(controller.create));
smartLinksRouter.patch('/:id', validate(smartLinkIdSchema, 'params'), validate(updateSmartLinkSchema), asyncHandler(controller.update));
smartLinksRouter.post('/:id/duplicate', validate(smartLinkIdSchema, 'params'), asyncHandler(controller.duplicate));
smartLinksRouter.post('/:id/deactivate', validate(smartLinkIdSchema, 'params'), asyncHandler(controller.deactivate));
smartLinksRouter.post('/:id/reactivate', validate(smartLinkIdSchema, 'params'), asyncHandler(controller.reactivate));
smartLinksRouter.get('/:id/metrics', validate(smartLinkIdSchema, 'params'), asyncHandler(controller.metrics));
smartLinksRouter.get('/:id/history', validate(smartLinkIdSchema, 'params'), asyncHandler(controller.auditHistory));
smartLinksRouter.get('/:id/qr.svg', validate(smartLinkIdSchema, 'params'), asyncHandler(controller.qrSvg));
smartLinksRouter.get('/:id/qr.png', validate(smartLinkIdSchema, 'params'), asyncHandler(controller.qrPng));
smartLinksRouter.get('/:id/sign.pdf', validate(smartLinkIdSchema, 'params'), asyncHandler(controller.signPdf));