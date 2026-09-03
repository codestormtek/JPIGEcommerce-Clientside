import { Request, Response } from 'express';
import { AuthRequest } from '../../types';
import { sendSuccess, sendCreated, sendPaginated } from '../../utils/apiResponse';
import * as service from './catering.service';
import * as repo from './catering.repository';
import {
  ListCateringMenuItemsInput,
  CreateCateringMenuItemInput,
  UpdateCateringMenuItemInput,
  ListPortionRulesInput,
  CreatePortionRuleInput,
  UpdatePortionRuleInput,
  ListPackagesInput,
  CreatePackageInput,
  UpdatePackageInput,
  ListDeliveryZonesInput,
  CreateDeliveryZoneInput,
  UpdateDeliveryZoneInput,
  ListAvailabilityInput,
  CreateAvailabilityInput,
  UpdateAvailabilityInput,
  ListQuotesInput,
  SubmitQuoteInput,
  UpdateQuoteInput,
  CalculateEstimateInput,
  DeliveryFeeCheckInput,
  AvailabilityCheckInput,
} from './catering.schema';
import { ApiError } from '../../utils/apiError';

// ─── Public endpoints ────────────────────────────────────────────────────────

export async function publicGetMenu(_req: Request, res: Response): Promise<void> {
  const menu = await service.getPublicMenu();
  sendSuccess(res, menu);
}

export async function publicGetPackages(_req: Request, res: Response): Promise<void> {
  const packages = await service.getPublicPackages();
  sendSuccess(res, packages);
}

export async function publicCalculateEstimate(req: Request, res: Response): Promise<void> {
  const estimate = await service.calculateEstimate(req.body as CalculateEstimateInput);
  sendSuccess(res, estimate);
}

export async function publicSubmitQuote(req: Request, res: Response): Promise<void> {
  const quote = await service.submitQuote(req.body as SubmitQuoteInput);
  sendCreated(res, quote, 'Quote submitted successfully');
}

export async function publicCheckAvailability(req: Request, res: Response): Promise<void> {
  const { date } = req.query as unknown as AvailabilityCheckInput;
  const result = await service.checkAvailability(date);
  sendSuccess(res, result);
}

export async function publicCheckDeliveryFee(req: Request, res: Response): Promise<void> {
  const { zip } = req.query as unknown as DeliveryFeeCheckInput;
  const result = await service.checkDeliveryFee(zip);
  sendSuccess(res, result);
}

// ─── Admin: Menu Items ───────────────────────────────────────────────────────

export async function listMenuItems(req: AuthRequest, res: Response): Promise<void> {
  const result = await repo.findMenuItems(req.query as unknown as ListCateringMenuItemsInput);
  sendPaginated(res, result);
}

export async function getMenuItem(req: AuthRequest, res: Response): Promise<void> {
  const item = await repo.findMenuItemById(req.params['id'] as string);
  if (!item) throw ApiError.notFound('Catering menu item');
  sendSuccess(res, item);
}

export async function createMenuItem(req: AuthRequest, res: Response): Promise<void> {
  const item = await repo.createMenuItem(req.body as CreateCateringMenuItemInput);
  sendCreated(res, item, 'Menu item created');
}

export async function updateMenuItem(req: AuthRequest, res: Response): Promise<void> {
  const item = await repo.updateMenuItem(req.params['id'] as string, req.body as UpdateCateringMenuItemInput);
  sendSuccess(res, item, 'Menu item updated');
}

export async function deleteMenuItem(req: AuthRequest, res: Response): Promise<void> {
  await repo.softDeleteMenuItem(req.params['id'] as string);
  sendSuccess(res, null, 'Menu item deleted');
}

// ─── Admin: Portion Rules ────────────────────────────────────────────────────

export async function listPortionRules(req: AuthRequest, res: Response): Promise<void> {
  const result = await repo.findPortionRules(req.query as unknown as ListPortionRulesInput);
  sendPaginated(res, result);
}

export async function getPortionRule(req: AuthRequest, res: Response): Promise<void> {
  const rule = await repo.findPortionRuleById(req.params['id'] as string);
  if (!rule) throw ApiError.notFound('Portion rule');
  sendSuccess(res, rule);
}

export async function createPortionRule(req: AuthRequest, res: Response): Promise<void> {
  const rule = await repo.createPortionRule(req.body as CreatePortionRuleInput);
  sendCreated(res, rule, 'Portion rule created');
}

export async function updatePortionRule(req: AuthRequest, res: Response): Promise<void> {
  const rule = await repo.updatePortionRule(req.params['id'] as string, req.body as UpdatePortionRuleInput);
  sendSuccess(res, rule, 'Portion rule updated');
}

export async function deletePortionRule(req: AuthRequest, res: Response): Promise<void> {
  await repo.deletePortionRule(req.params['id'] as string);
  sendSuccess(res, null, 'Portion rule deleted');
}

// ─── Admin: Packages ─────────────────────────────────────────────────────────

export async function listPackages(req: AuthRequest, res: Response): Promise<void> {
  const result = await repo.findPackages(req.query as unknown as ListPackagesInput);
  sendPaginated(res, result);
}

export async function getPackage(req: AuthRequest, res: Response): Promise<void> {
  const pkg = await repo.findPackageById(req.params['id'] as string);
  if (!pkg) throw ApiError.notFound('Catering package');
  sendSuccess(res, pkg);
}

export async function createPackage(req: AuthRequest, res: Response): Promise<void> {
  const pkg = await repo.createPackage(req.body as CreatePackageInput);
  sendCreated(res, pkg, 'Package created');
}

export async function updatePackage(req: AuthRequest, res: Response): Promise<void> {
  const pkg = await repo.updatePackage(req.params['id'] as string, req.body as UpdatePackageInput);
  sendSuccess(res, pkg, 'Package updated');
}

export async function deletePackage(req: AuthRequest, res: Response): Promise<void> {
  await repo.softDeletePackage(req.params['id'] as string);
  sendSuccess(res, null, 'Package deleted');
}

// ─── Admin: Delivery Zones ──────────────────────────────────────────────────

export async function listDeliveryZones(req: AuthRequest, res: Response): Promise<void> {
  const result = await repo.findDeliveryZones(req.query as unknown as ListDeliveryZonesInput);
  sendPaginated(res, result);
}

export async function getDeliveryZone(req: AuthRequest, res: Response): Promise<void> {
  const zone = await repo.findDeliveryZoneById(req.params['id'] as string);
  if (!zone) throw ApiError.notFound('Delivery zone');
  sendSuccess(res, zone);
}

export async function createDeliveryZone(req: AuthRequest, res: Response): Promise<void> {
  const zone = await repo.createDeliveryZone(req.body as CreateDeliveryZoneInput);
  sendCreated(res, zone, 'Delivery zone created');
}

export async function updateDeliveryZone(req: AuthRequest, res: Response): Promise<void> {
  const zone = await repo.updateDeliveryZone(req.params['id'] as string, req.body as UpdateDeliveryZoneInput);
  sendSuccess(res, zone, 'Delivery zone updated');
}

export async function deleteDeliveryZone(req: AuthRequest, res: Response): Promise<void> {
  await repo.deleteDeliveryZone(req.params['id'] as string);
  sendSuccess(res, null, 'Delivery zone deleted');
}

// ─── Admin: Availability ─────────────────────────────────────────────────────

export async function listAvailability(req: AuthRequest, res: Response): Promise<void> {
  const result = await repo.findAvailability(req.query as unknown as ListAvailabilityInput);
  sendPaginated(res, result);
}

export async function getAvailability(req: AuthRequest, res: Response): Promise<void> {
  const rule = await repo.findAvailabilityById(req.params['id'] as string);
  if (!rule) throw ApiError.notFound('Availability rule');
  sendSuccess(res, rule);
}

export async function createAvailability(req: AuthRequest, res: Response): Promise<void> {
  const rule = await repo.createAvailability(req.body as CreateAvailabilityInput);
  sendCreated(res, rule, 'Availability rule created');
}

export async function updateAvailability(req: AuthRequest, res: Response): Promise<void> {
  const rule = await repo.updateAvailability(req.params['id'] as string, req.body as UpdateAvailabilityInput);
  sendSuccess(res, rule, 'Availability rule updated');
}

export async function deleteAvailability(req: AuthRequest, res: Response): Promise<void> {
  await repo.deleteAvailability(req.params['id'] as string);
  sendSuccess(res, null, 'Availability rule deleted');
}

// ─── Admin: Quotes ───────────────────────────────────────────────────────────

export async function listQuotes(req: AuthRequest, res: Response): Promise<void> {
  const result = await repo.findQuotes(req.query as unknown as ListQuotesInput);
  sendPaginated(res, result);
}

export async function getQuote(req: AuthRequest, res: Response): Promise<void> {
  const quote = await repo.findQuoteById(req.params['id'] as string);
  if (!quote) throw ApiError.notFound('Catering quote');
  sendSuccess(res, quote);
}

export async function updateQuote(req: AuthRequest, res: Response): Promise<void> {
  const quote = await service.updateQuote(req.params['id'] as string, req.body as UpdateQuoteInput);
  sendSuccess(res, quote, 'Quote updated');
}

export async function deleteQuote(req: AuthRequest, res: Response): Promise<void> {
  await repo.deleteQuote(req.params['id'] as string);
  sendSuccess(res, null, 'Quote deleted');
}

// ─── Admin: Dashboard & Production ──────────────────────────────────────────

export async function getDashboard(_req: AuthRequest, res: Response): Promise<void> {
  const stats = await service.getDashboard();
  sendSuccess(res, stats);
}

export async function getProduction(req: AuthRequest, res: Response): Promise<void> {
  const date = req.query['date'] as string;
  if (!date) throw ApiError.badRequest('Date query parameter is required');
  const production = await service.getProduction(date);
  sendSuccess(res, production);
}
