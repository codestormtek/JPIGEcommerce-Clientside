import { Request, Response } from 'express';
import { AuthRequest } from '../../types';
import { sendSuccess, sendCreated, sendPaginated } from '../../utils/apiResponse';
import * as service from './live-sessions.service';
import {
  CreateLiveSessionInput,
  UpdateLiveSessionInput,
  ListLiveSessionsInput,
  GoLiveInput,
  SendAlertInput,
  TestSmsInput,
  AlertHistoryInput,
  PublicSubscribeInput,
  PublicUnsubscribeInput,
} from './live-sessions.schema';

export async function createSession(req: AuthRequest, res: Response): Promise<void> {
  const session = await service.createSession(req.body as CreateLiveSessionInput, req.user?.sub);
  sendCreated(res, session, 'Live session created');
}

export async function listSessions(req: AuthRequest, res: Response): Promise<void> {
  const result = await service.listSessions(req.query as unknown as ListLiveSessionsInput);
  sendPaginated(res, result);
}

export async function getSession(req: AuthRequest, res: Response): Promise<void> {
  const session = await service.getSession(req.params['id'] as string);
  sendSuccess(res, session);
}

export async function updateSession(req: AuthRequest, res: Response): Promise<void> {
  const session = await service.updateSession(req.params['id'] as string, req.body as UpdateLiveSessionInput);
  sendSuccess(res, session, 'Live session updated');
}

export async function deleteSession(req: AuthRequest, res: Response): Promise<void> {
  await service.deleteSession(req.params['id'] as string);
  sendSuccess(res, null, 'Live session deleted');
}

export async function goLive(req: AuthRequest, res: Response): Promise<void> {
  const input = req.body as GoLiveInput;
  const session = await service.goLive(req.params['id'] as string, input.message);
  sendSuccess(res, session, 'Session is now live');
}

export async function closeSession(req: AuthRequest, res: Response): Promise<void> {
  const session = await service.closeSession(req.params['id'] as string);
  sendSuccess(res, session, 'Session closed');
}

export async function sendAlert(req: AuthRequest, res: Response): Promise<void> {
  const result = await service.sendAlert(req.params['id'] as string, req.body as SendAlertInput, req.user?.sub);
  sendSuccess(res, result, 'Alert sent');
}

export async function testSms(req: AuthRequest, res: Response): Promise<void> {
  const input = req.body as TestSmsInput;
  const result = await service.sendTestSmsToAdmin(input.to, input.body);
  sendSuccess(res, result, 'Test SMS sent');
}

export async function alertHistory(req: AuthRequest, res: Response): Promise<void> {
  const result = await service.getAlertHistory(req.query as unknown as AlertHistoryInput);
  sendPaginated(res, result);
}

export async function subscriberCount(_req: AuthRequest, res: Response): Promise<void> {
  const count = await service.getSubscriberCount();
  sendSuccess(res, { count });
}

export async function publicGetCurrent(_req: Request, res: Response): Promise<void> {
  const session = await service.getCurrentLiveSession();
  sendSuccess(res, session);
}

export async function publicSubscribe(req: Request, res: Response): Promise<void> {
  const result = await service.publicSubscribe(req.body as PublicSubscribeInput);
  sendSuccess(res, result);
}

export async function publicUnsubscribe(req: Request, res: Response): Promise<void> {
  const input = req.body as PublicUnsubscribeInput;
  const result = await service.publicUnsubscribe(input.phone);
  sendSuccess(res, result);
}
