import { Response } from 'express';
import { AuthRequest } from '../../types';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from '../../utils/apiResponse';
import { ApiError } from '../../utils/apiError';
import type {
  ListChecklistsInput, CreateChecklistInput, UpdateChecklistInput,
  CreateTaskInput, UpdateTaskInput, ReorderTasksInput, SyncChecklistInput,
} from './checklists.schema';
import * as service from './checklists.service';

function requireUser(req: AuthRequest): string {
  const userId = req.user?.sub;
  if (!userId) throw ApiError.unauthorized();
  return userId;
}

// ─── Checklists ───────────────────────────────────────────────────────────────

// GET /api/v1/checklists
export async function listChecklists(req: AuthRequest, res: Response): Promise<void> {
  const userId = requireUser(req);
  const result = await service.listChecklists(userId, req.query as unknown as ListChecklistsInput);
  sendPaginated(res, result);
}

// GET /api/v1/checklists/:id
export async function getChecklist(req: AuthRequest, res: Response): Promise<void> {
  const userId = requireUser(req);
  const checklist = await service.getChecklist(req.params.id, userId);
  sendSuccess(res, checklist);
}

// POST /api/v1/checklists
export async function createChecklist(req: AuthRequest, res: Response): Promise<void> {
  const userId = requireUser(req);
  const checklist = await service.createChecklist(userId, req.body as CreateChecklistInput);
  sendCreated(res, checklist);
}

// PATCH /api/v1/checklists/:id
export async function updateChecklist(req: AuthRequest, res: Response): Promise<void> {
  const userId = requireUser(req);
  const checklist = await service.updateChecklist(req.params.id, userId, req.body as UpdateChecklistInput);
  sendSuccess(res, checklist);
}

// DELETE /api/v1/checklists/:id
export async function deleteChecklist(req: AuthRequest, res: Response): Promise<void> {
  const userId = requireUser(req);
  await service.deleteChecklist(req.params.id, userId);
  sendNoContent(res);
}

// POST /api/v1/checklists/:id/sync
export async function syncChecklist(req: AuthRequest, res: Response): Promise<void> {
  const userId = requireUser(req);
  const result = await service.syncChecklist(req.params.id, userId, req.body as SyncChecklistInput);
  sendSuccess(res, result);
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

// POST /api/v1/checklists/:id/tasks
export async function createTask(req: AuthRequest, res: Response): Promise<void> {
  const userId = requireUser(req);
  const task = await service.createTask(req.params.id, userId, req.body as CreateTaskInput);
  sendCreated(res, task);
}

// PATCH /api/v1/checklists/:id/tasks/:taskId
export async function updateTask(req: AuthRequest, res: Response): Promise<void> {
  const task = await service.updateTask(req.params.taskId, req.body as UpdateTaskInput);
  sendSuccess(res, task);
}

// DELETE /api/v1/checklists/:id/tasks/:taskId
export async function deleteTask(req: AuthRequest, res: Response): Promise<void> {
  await service.deleteTask(req.params.taskId);
  sendNoContent(res);
}

// PUT /api/v1/checklists/:id/tasks/reorder
export async function reorderTasks(req: AuthRequest, res: Response): Promise<void> {
  await service.reorderTasks(req.body as ReorderTasksInput);
  sendNoContent(res);
}

