import { Response } from 'express';
import { AuthRequest } from '../../types';
import { sendSuccess, sendCreated } from '../../utils/apiResponse';
import * as service from './order-notifications.service';
import { CreateRecipientInput, UpdateRecipientInput } from './order-notifications.schema';

export async function list(_req: AuthRequest, res: Response): Promise<void> {
  sendSuccess(res, await service.listRecipients());
}

export async function create(req: AuthRequest, res: Response): Promise<void> {
  const result = await service.createRecipient(req.body as CreateRecipientInput);
  sendCreated(res, result, 'Recipient added');
}

export async function update(req: AuthRequest, res: Response): Promise<void> {
  const result = await service.updateRecipient(req.params['id'] as string, req.body as UpdateRecipientInput);
  sendSuccess(res, result, 'Recipient updated');
}

export async function remove(req: AuthRequest, res: Response): Promise<void> {
  const result = await service.deleteRecipient(req.params['id'] as string);
  sendSuccess(res, result, 'Recipient removed');
}

export async function sendTest(req: AuthRequest, res: Response): Promise<void> {
  const result = await service.sendTest(req.params['id'] as string);
  sendSuccess(res, result, 'Test SMS sent');
}
