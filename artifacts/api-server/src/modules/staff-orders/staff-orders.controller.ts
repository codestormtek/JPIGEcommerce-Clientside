import { Response } from 'express';
import { AuthRequest } from '../../types';
import { sendNoContent, sendPaginated, sendSuccess } from '../../utils/apiResponse';
import { ctxFromRequest } from '../../utils/auditLogger';
import * as service from './staff-orders.service';
import {
  RegisterPushTokenInput,
  StaffOrderListInput,
  UpdatePushTokenInput,
} from './staff-orders.schema';

export async function dashboard(_req: AuthRequest, res: Response) {
  sendSuccess(res, await service.getStaffOrderDashboard());
}

export async function list(req: AuthRequest, res: Response) {
  sendPaginated(res, await service.listStaffOrders(req.query as unknown as StaffOrderListInput));
}

export async function detail(req: AuthRequest, res: Response) {
  sendSuccess(res, await service.getStaffOrder(req.params['orderId'] as string));
}

async function transition(req: AuthRequest, res: Response, target: 'processing' | 'ready_to_ship' | 'delivered') {
  const adminId = req.user!.sub;
  sendSuccess(res, await service.transitionStaffOrder(
    req.params['orderId'] as string,
    target,
    adminId,
    ctxFromRequest(req, adminId),
  ));
}

export const start = (req: AuthRequest, res: Response) => transition(req, res, 'processing');
export const ready = (req: AuthRequest, res: Response) => transition(req, res, 'ready_to_ship');
export const pickedUp = (req: AuthRequest, res: Response) => transition(req, res, 'delivered');

export async function registerPushToken(req: AuthRequest, res: Response) {
  sendSuccess(res, await service.registerPushToken(req.user!.sub, req.body as RegisterPushTokenInput));
}

export async function updatePushToken(req: AuthRequest, res: Response) {
  sendSuccess(res, await service.updatePushToken(
    req.user!.sub,
    req.params['tokenId'] as string,
    req.body as UpdatePushTokenInput,
  ));
}

export async function deletePushToken(req: AuthRequest, res: Response) {
  await service.deletePushToken(req.user!.sub, req.params['tokenId'] as string);
  sendNoContent(res);
}