import { Request, Response } from 'express';
import { sendSuccess, sendCreated } from '../../utils/apiResponse';
import { PickupCheckoutInput, PickupConfigInput } from './pickup.schema';
import * as service from './pickup.service';

export async function getPublicConfig(_req: Request, res: Response): Promise<void> {
  sendSuccess(res, await service.getPublicPickupConfig());
}

export async function checkout(req: Request, res: Response): Promise<void> {
  sendCreated(res, await service.createPickupOrder(req.body as PickupCheckoutInput), 'Pickup order received');
}

export async function getOrderStatus(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await service.getPickupOrderStatus(req.params['capability'] as string));
}

export async function recoverOrderAttempt(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await service.recoverPickupOrderAttempt(req.params['requestId'] as string));
}

export async function getAdminConfig(_req: Request, res: Response): Promise<void> {
  sendSuccess(res, await service.getAdminPickupConfig());
}

export async function updateAdminConfig(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await service.updatePickupConfig(req.body as PickupConfigInput), 'Pickup settings saved');
}