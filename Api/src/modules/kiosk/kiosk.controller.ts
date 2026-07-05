import { Request, Response } from 'express';
import * as service from './kiosk.service';
import { KioskRequest } from './kiosk.middleware';
import { KioskOrderInput, CreateKioskDeviceInput, UpdateKioskDeviceInput } from './kiosk.schema';
import { sendSuccess, sendCreated } from '../../utils/apiResponse';

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
