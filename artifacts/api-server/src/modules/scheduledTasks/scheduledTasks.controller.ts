import { Request, Response } from 'express';
import { AuthRequest } from '../../types';
import { sendSuccess, sendNoContent, sendPaginated } from '../../utils/apiResponse';
import { ctxFromRequest } from '../../utils/auditLogger';
import {
  ListTasksInput, CreateTaskInput, UpdateTaskInput, RunTaskInput, HistoryQueryInput,
} from './scheduledTasks.schema';
import * as service from './scheduledTasks.service';

export async function listTasks(req: Request, res: Response): Promise<void> {
  const result = await service.listTasks(req.query as unknown as ListTasksInput);
  sendPaginated(res, result);
}

export async function getTask(req: Request, res: Response): Promise<void> {
  const task = await service.getTask(req.params['id'] as string);
  sendSuccess(res, task);
}

export async function createTask(req: AuthRequest, res: Response): Promise<void> {
  const task = await service.createTask(
    req.body as CreateTaskInput,
    ctxFromRequest(req, req.user?.sub),
  );
  sendSuccess(res, task, 'Scheduled task created', 201);
}

export async function updateTask(req: AuthRequest, res: Response): Promise<void> {
  const task = await service.updateTask(
    req.params['id'] as string,
    req.body as UpdateTaskInput,
    ctxFromRequest(req, req.user?.sub),
  );
  sendSuccess(res, task);
}

export async function deleteTask(req: AuthRequest, res: Response): Promise<void> {
  await service.deleteTask(
    req.params['id'] as string,
    ctxFromRequest(req, req.user?.sub),
  );
  sendNoContent(res);
}

export async function enableTask(req: AuthRequest, res: Response): Promise<void> {
  const task = await service.enableTask(
    req.params['id'] as string,
    ctxFromRequest(req, req.user?.sub),
  );
  sendSuccess(res, task, 'Task enabled');
}

export async function disableTask(req: AuthRequest, res: Response): Promise<void> {
  const task = await service.disableTask(
    req.params['id'] as string,
    ctxFromRequest(req, req.user?.sub),
  );
  sendSuccess(res, task, 'Task disabled');
}

export async function runTask(req: AuthRequest, res: Response): Promise<void> {
  const result = await service.runTask(
    req.params['id'] as string,
    req.body as RunTaskInput,
    ctxFromRequest(req, req.user?.sub),
  );
  sendSuccess(res, result, 'Task execution queued', 202);
}

export async function getHistory(req: Request, res: Response): Promise<void> {
  const result = await service.getHistory(
    req.params['id'] as string,
    req.query as unknown as HistoryQueryInput,
  );
  sendPaginated(res, result);
}

export async function getExecutionDetail(req: Request, res: Response): Promise<void> {
  const execution = await service.getExecutionDetail(req.params['executionId'] as string);
  sendSuccess(res, execution);
}

export async function getTaskTypes(_req: Request, res: Response): Promise<void> {
  const types = service.getTaskTypes();
  sendSuccess(res, types);
}

export async function getTimezones(_req: Request, res: Response): Promise<void> {
  const timezones = service.getTimezones();
  sendSuccess(res, timezones);
}
