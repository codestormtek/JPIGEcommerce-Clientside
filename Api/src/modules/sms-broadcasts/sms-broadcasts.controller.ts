import { Response } from 'express';
import { AuthRequest } from '../../types';
import { sendSuccess, sendCreated, sendPaginated } from '../../utils/apiResponse';
import * as service from './sms-broadcasts.service';
import {
  ListBroadcastsInput,
  PreviewAudienceInput,
  SendBroadcastInput,
} from './sms-broadcasts.schema';

export async function getTopics(_req: AuthRequest, res: Response): Promise<void> {
  sendSuccess(res, service.getTopics());
}

export async function previewAudience(req: AuthRequest, res: Response): Promise<void> {
  const result = await service.previewAudience(req.query as unknown as PreviewAudienceInput);
  sendSuccess(res, result);
}

export async function sendBroadcast(req: AuthRequest, res: Response): Promise<void> {
  const result = await service.sendBroadcast(req.body as SendBroadcastInput, req.user?.sub);
  sendCreated(res, result, 'Broadcast sent');
}

export async function listBroadcasts(req: AuthRequest, res: Response): Promise<void> {
  const result = await service.listBroadcasts(req.query as unknown as ListBroadcastsInput);
  sendPaginated(res, result);
}

export async function getBroadcast(req: AuthRequest, res: Response): Promise<void> {
  const result = await service.getBroadcast(req.params['id'] as string);
  sendSuccess(res, result);
}
