import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import { createSettingSchema, updateSettingSchema, bulkUpdateSettingsSchema } from './site-settings.schema';
import * as ctrl from './site-settings.controller';

export const siteSettingsRouter = Router();

siteSettingsRouter.get('/public', asyncHandler(ctrl.getPublicSettings));
siteSettingsRouter.get('/public/:key', asyncHandler(ctrl.getSettingByKey));

siteSettingsRouter.get('/', authenticate, authorize('admin'), asyncHandler(ctrl.getAllSettings));
siteSettingsRouter.post('/', authenticate, authorize('admin'), validate(createSettingSchema), asyncHandler(ctrl.createSetting));
siteSettingsRouter.patch('/:key', authenticate, authorize('admin'), validate(updateSettingSchema), asyncHandler(ctrl.updateSetting));
siteSettingsRouter.delete('/:key', authenticate, authorize('admin'), asyncHandler(ctrl.deleteSetting));
siteSettingsRouter.put('/bulk', authenticate, authorize('admin'), validate(bulkUpdateSettingsSchema), asyncHandler(ctrl.bulkUpdateSettings));
