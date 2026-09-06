import { Request, Response } from 'express';
import * as service from './kiosk.service';
import { KioskRequest } from './kiosk.middleware';
import {
  KioskOrderInput,
  CreateKioskDeviceInput,
  UpdateKioskDeviceInput,
  CreateKioskCampaignInput,
  UpdateKioskCampaignInput,
  KioskAnalyticsEventInput,
} from './kiosk.schema';
import { sendSuccess, sendCreated, sendNoContent } from '../../utils/apiResponse';

// ─── Kiosk-facing (device token auth) ────────────────────────────────────────

export async function getMenu(_req: Request, res: Response): Promise<void> {
  const menu = await service.getKioskMenu();
  sendSuccess(res, menu);
}

export async function createOrder(req: KioskRequest, res: Response): Promise<void> {
  const result = await service.createKioskOrder(
    req.kioskDevice!.id,
    req.body as KioskOrderInput,
  );
  sendCreated(res, result, 'Order placed');
}

export async function getOrderStatus(req: KioskRequest, res: Response): Promise<void> {
  const result = await service.getKioskOrderStatus(
    req.kioskDevice!.id,
    req.params['id'] as string,
  );
  sendSuccess(res, result);
}

export async function heartbeat(req: KioskRequest, res: Response): Promise<void> {
  // authenticateKiosk already bumped lastSeenAt
  sendSuccess(res, { ok: true, device: req.kioskDevice!.name });
}

export async function createAnalyticsEvent(req: KioskRequest, res: Response): Promise<void> {
  await service.createKioskAnalyticsEvent(
    req.kioskDevice!.id,
    req.body as KioskAnalyticsEventInput,
  );
  sendCreated(res, { accepted: true }, 'Analytics event accepted');
}

export async function getConfig(req: KioskRequest, res: Response): Promise<void> {
  const cfg = await service.getKioskConfig(req.kioskDevice!.id);
  sendSuccess(res, cfg);
}

export async function listCampaigns(req: KioskRequest, res: Response): Promise<void> {
  const campaigns = req.kioskDevice
    ? await service.getActiveKioskCampaigns()
    : await service.listKioskCampaignsAdmin();
  sendSuccess(res, campaigns);
}

export async function getPaymentStatus(req: KioskRequest, res: Response): Promise<void> {
  const result = await service.getKioskPaymentStatus(
    req.kioskDevice!.id,
    req.params['id'] as string,
  );
  sendSuccess(res, result);
}

export async function cancelPayment(req: KioskRequest, res: Response): Promise<void> {
  const result = await service.cancelKioskPayment(
    req.kioskDevice!.id,
    req.params['id'] as string,
  );
  sendSuccess(res, result);
}

// ─── Admin (JWT auth) ────────────────────────────────────────────────────────

export async function listDevices(_req: Request, res: Response): Promise<void> {
  const devices = await service.listKioskDevices();
  sendSuccess(res, devices);
}

export async function createDevice(req: Request, res: Response): Promise<void> {
  const device = await service.createKioskDevice(req.body as CreateKioskDeviceInput);
  sendCreated(res, device, 'Kiosk device created — save the token now, it is only shown once');
}

export async function updateDevice(req: Request, res: Response): Promise<void> {
  const device = await service.updateKioskDevice(
    req.params['id'] as string,
    req.body as UpdateKioskDeviceInput,
  );
  sendSuccess(res, device);
}

export async function deleteDevice(req: Request, res: Response): Promise<void> {
  const result = await service.deleteKioskDevice(req.params['id'] as string);
  sendSuccess(res, result);
}

export async function startPairing(req: Request, res: Response): Promise<void> {
  const result = await service.startTerminalPairing(req.params['id'] as string);
  sendSuccess(res, result);
}

export async function checkPairing(req: Request, res: Response): Promise<void> {
  const result = await service.checkTerminalPairing(
    req.params['id'] as string,
    req.params['codeId'] as string,
  );
  sendSuccess(res, result);
}

export async function getCampaign(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await service.getKioskCampaign(req.params['id'] as string));
}

export async function createCampaign(req: Request, res: Response): Promise<void> {
  const campaign = await service.createKioskCampaign(req.body as CreateKioskCampaignInput);
  sendCreated(res, campaign, 'Kiosk campaign created');
}

export async function updateCampaign(req: Request, res: Response): Promise<void> {
  const campaign = await service.updateKioskCampaign(
    req.params['id'] as string,
    req.body as UpdateKioskCampaignInput,
  );
  sendSuccess(res, campaign, 'Kiosk campaign updated');
}

export async function deleteCampaign(req: Request, res: Response): Promise<void> {
  await service.deleteKioskCampaign(req.params['id'] as string);
  sendNoContent(res);
}
