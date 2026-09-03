import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import * as ctrl from './catering.controller';
import {
  createCateringMenuItemSchema,
  updateCateringMenuItemSchema,
  listCateringMenuItemsSchema,
  createPortionRuleSchema,
  updatePortionRuleSchema,
  listPortionRulesSchema,
  createPackageSchema,
  updatePackageSchema,
  listPackagesSchema,
  createDeliveryZoneSchema,
  updateDeliveryZoneSchema,
  listDeliveryZonesSchema,
  createAvailabilitySchema,
  updateAvailabilitySchema,
  listAvailabilitySchema,
  submitQuoteSchema,
  updateQuoteSchema,
  listQuotesSchema,
  calculateEstimateSchema,
  deliveryFeeCheckSchema,
  availabilityCheckSchema,
} from './catering.schema';

export const cateringRouter = Router();

// ─── Public endpoints (no auth) ─────────────────────────────────────────────

cateringRouter.get('/public/menu', asyncHandler(ctrl.publicGetMenu));
cateringRouter.get('/public/packages', asyncHandler(ctrl.publicGetPackages));
cateringRouter.post('/public/estimate', validate(calculateEstimateSchema), asyncHandler(ctrl.publicCalculateEstimate));
cateringRouter.post('/public/quote', validate(submitQuoteSchema), asyncHandler(ctrl.publicSubmitQuote));
cateringRouter.get('/public/availability', validate(availabilityCheckSchema, 'query'), asyncHandler(ctrl.publicCheckAvailability));
cateringRouter.get('/public/delivery-fee', validate(deliveryFeeCheckSchema, 'query'), asyncHandler(ctrl.publicCheckDeliveryFee));

// ─── Admin: Menu Items ──────────────────────────────────────────────────────

cateringRouter.get('/menu-items', authenticate, authorize('admin'), validate(listCateringMenuItemsSchema, 'query'), asyncHandler(ctrl.listMenuItems));
cateringRouter.get('/menu-items/:id', authenticate, authorize('admin'), asyncHandler(ctrl.getMenuItem));
cateringRouter.post('/menu-items', authenticate, authorize('admin'), validate(createCateringMenuItemSchema), asyncHandler(ctrl.createMenuItem));
cateringRouter.patch('/menu-items/:id', authenticate, authorize('admin'), validate(updateCateringMenuItemSchema), asyncHandler(ctrl.updateMenuItem));
cateringRouter.delete('/menu-items/:id', authenticate, authorize('admin'), asyncHandler(ctrl.deleteMenuItem));

// ─── Admin: Portion Rules ────────────────────────────────────────────────────

cateringRouter.get('/portion-rules', authenticate, authorize('admin'), validate(listPortionRulesSchema, 'query'), asyncHandler(ctrl.listPortionRules));
cateringRouter.get('/portion-rules/:id', authenticate, authorize('admin'), asyncHandler(ctrl.getPortionRule));
cateringRouter.post('/portion-rules', authenticate, authorize('admin'), validate(createPortionRuleSchema), asyncHandler(ctrl.createPortionRule));
cateringRouter.patch('/portion-rules/:id', authenticate, authorize('admin'), validate(updatePortionRuleSchema), asyncHandler(ctrl.updatePortionRule));
cateringRouter.delete('/portion-rules/:id', authenticate, authorize('admin'), asyncHandler(ctrl.deletePortionRule));

// ─── Admin: Packages ─────────────────────────────────────────────────────────

cateringRouter.get('/packages', authenticate, authorize('admin'), validate(listPackagesSchema, 'query'), asyncHandler(ctrl.listPackages));
cateringRouter.get('/packages/:id', authenticate, authorize('admin'), asyncHandler(ctrl.getPackage));
cateringRouter.post('/packages', authenticate, authorize('admin'), validate(createPackageSchema), asyncHandler(ctrl.createPackage));
cateringRouter.patch('/packages/:id', authenticate, authorize('admin'), validate(updatePackageSchema), asyncHandler(ctrl.updatePackage));
cateringRouter.delete('/packages/:id', authenticate, authorize('admin'), asyncHandler(ctrl.deletePackage));

// ─── Admin: Delivery Zones ──────────────────────────────────────────────────

cateringRouter.get('/delivery-zones', authenticate, authorize('admin'), validate(listDeliveryZonesSchema, 'query'), asyncHandler(ctrl.listDeliveryZones));
cateringRouter.get('/delivery-zones/:id', authenticate, authorize('admin'), asyncHandler(ctrl.getDeliveryZone));
cateringRouter.post('/delivery-zones', authenticate, authorize('admin'), validate(createDeliveryZoneSchema), asyncHandler(ctrl.createDeliveryZone));
cateringRouter.patch('/delivery-zones/:id', authenticate, authorize('admin'), validate(updateDeliveryZoneSchema), asyncHandler(ctrl.updateDeliveryZone));
cateringRouter.delete('/delivery-zones/:id', authenticate, authorize('admin'), asyncHandler(ctrl.deleteDeliveryZone));

// ─── Admin: Availability ─────────────────────────────────────────────────────

cateringRouter.get('/availability', authenticate, authorize('admin'), validate(listAvailabilitySchema, 'query'), asyncHandler(ctrl.listAvailability));
cateringRouter.get('/availability/:id', authenticate, authorize('admin'), asyncHandler(ctrl.getAvailability));
cateringRouter.post('/availability', authenticate, authorize('admin'), validate(createAvailabilitySchema), asyncHandler(ctrl.createAvailability));
cateringRouter.patch('/availability/:id', authenticate, authorize('admin'), validate(updateAvailabilitySchema), asyncHandler(ctrl.updateAvailability));
cateringRouter.delete('/availability/:id', authenticate, authorize('admin'), asyncHandler(ctrl.deleteAvailability));

// ─── Admin: Quotes ───────────────────────────────────────────────────────────

cateringRouter.get('/quotes', authenticate, authorize('admin'), validate(listQuotesSchema, 'query'), asyncHandler(ctrl.listQuotes));
cateringRouter.get('/quotes/:id', authenticate, authorize('admin'), asyncHandler(ctrl.getQuote));
cateringRouter.patch('/quotes/:id', authenticate, authorize('admin'), validate(updateQuoteSchema), asyncHandler(ctrl.updateQuote));
cateringRouter.delete('/quotes/:id', authenticate, authorize('admin'), asyncHandler(ctrl.deleteQuote));

// ─── Admin: Dashboard & Production ──────────────────────────────────────────

cateringRouter.get('/dashboard', authenticate, authorize('admin'), asyncHandler(ctrl.getDashboard));
cateringRouter.get('/production', authenticate, authorize('admin'), asyncHandler(ctrl.getProduction));
