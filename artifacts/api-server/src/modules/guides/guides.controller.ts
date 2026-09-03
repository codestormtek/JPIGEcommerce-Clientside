import { Request, Response } from 'express';
import { sendSuccess, sendCreated, sendNoContent } from '../../utils/apiResponse';
import { ApiError } from '../../utils/apiError';
import { AuthRequest } from '../../types';
import * as service from './guides.service';
import {
  CreateSectionInput, UpdateSectionInput, ReorderInput,
  CreateBlockInput, UpdateBlockInput,
  CreateStepInput, UpdateStepInput,
} from './guides.schema';

// GET /api/v1/guides
export async function getGuideTree(_req: Request, res: Response): Promise<void> {
  sendSuccess(res, await service.getGuideTree());
}

// ─── Sections ─────────────────────────────────────────────────────────────────

export async function createSection(req: Request, res: Response): Promise<void> {
  sendCreated(res, await service.createSection(req.body as CreateSectionInput), 'Section created');
}

export async function updateSection(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await service.updateSection(req.params['id'] as string, req.body as UpdateSectionInput), 'Section updated');
}

export async function deleteSection(req: Request, res: Response): Promise<void> {
  await service.deleteSection(req.params['id'] as string);
  sendNoContent(res);
}

export async function reorderSections(req: Request, res: Response): Promise<void> {
  await service.reorderSections((req.body as ReorderInput).ids);
  sendSuccess(res, null, 'Sections reordered');
}

// ─── Blocks ───────────────────────────────────────────────────────────────────

export async function createBlock(req: Request, res: Response): Promise<void> {
  sendCreated(res, await service.createBlock(req.params['id'] as string, req.body as CreateBlockInput), 'Block created');
}

export async function updateBlock(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await service.updateBlock(req.params['blockId'] as string, req.body as UpdateBlockInput), 'Block updated');
}

export async function deleteBlock(req: Request, res: Response): Promise<void> {
  await service.deleteBlock(req.params['blockId'] as string);
  sendNoContent(res);
}

export async function reorderBlocks(req: Request, res: Response): Promise<void> {
  await service.reorderBlocks(req.params['id'] as string, (req.body as ReorderInput).ids);
  sendSuccess(res, null, 'Blocks reordered');
}

// ─── Steps ────────────────────────────────────────────────────────────────────

export async function createStep(req: Request, res: Response): Promise<void> {
  sendCreated(res, await service.createStep(req.params['blockId'] as string, req.body as CreateStepInput), 'Step created');
}

export async function updateStep(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await service.updateStep(req.params['stepId'] as string, req.body as UpdateStepInput), 'Step updated');
}

export async function deleteStep(req: Request, res: Response): Promise<void> {
  await service.deleteStep(req.params['stepId'] as string);
  sendNoContent(res);
}

export async function reorderSteps(req: Request, res: Response): Promise<void> {
  await service.reorderSteps(req.params['blockId'] as string, (req.body as ReorderInput).ids);
  sendSuccess(res, null, 'Steps reordered');
}

// ─── Acknowledgments ──────────────────────────────────────────────────────────

export async function ackSection(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthRequest).user!.sub;
  sendSuccess(res, await service.ackSection(userId, req.params['id'] as string), 'Section marked as read');
}

export async function unackSection(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthRequest).user!.sub;
  await service.unackSection(userId, req.params['id'] as string);
  sendNoContent(res);
}

export async function getMyAcks(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthRequest).user!.sub;
  sendSuccess(res, await service.getMyAcks(userId));
}

export async function getAckReport(_req: Request, res: Response): Promise<void> {
  sendSuccess(res, await service.getAckReport());
}

// ─── Image upload ─────────────────────────────────────────────────────────────

export async function uploadImage(req: Request, res: Response): Promise<void> {
  if (!req.file) throw ApiError.badRequest('No file uploaded (field name must be "file")');
  sendCreated(res, await service.uploadGuideImage(req.file), 'Image uploaded');
}
