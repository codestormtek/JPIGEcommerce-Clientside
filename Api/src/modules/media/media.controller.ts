import { Request, Response } from 'express';
import { AuthRequest } from '../../types';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from '../../utils/apiResponse';
import { ListMediaInput, CreateMediaInput, UpdateMediaInput } from './media.schema';
import * as service from './media.service';

// GET /api/v1/media
export async function listMedia(req: Request, res: Response): Promise<void> {
  const result = await service.listMedia(req.query as unknown as ListMediaInput);
  sendPaginated(res, result);
}

// GET /api/v1/media/:id
export async function getMediaById(req: Request, res: Response): Promise<void> {
  const asset = await service.getMediaById(req.params['id'] as string);
  sendSuccess(res, asset);
}

// POST /api/v1/media
export async function createMedia(req: Request, res: Response): Promise<void> {
  const asset = await service.createMedia(req.body as CreateMediaInput);
  sendCreated(res, asset, 'Media asset created');
}

// PATCH /api/v1/media/:id
export async function updateMedia(req: Request, res: Response): Promise<void> {
  const asset = await service.updateMedia(req.params['id'] as string, req.body as UpdateMediaInput);
  sendSuccess(res, asset, 'Media asset updated');
}

// DELETE /api/v1/media/:id
export async function deleteMedia(req: Request, res: Response): Promise<void> {
  await service.deleteMedia(req.params['id'] as string);
  sendNoContent(res);
}

// POST /api/v1/media/upload
export async function uploadMedia(req: AuthRequest, res: Response): Promise<void> {
  if (!req.file) throw new Error('No file attached');
  const folder = (req.body?.folder as string) || 'media';
  const asset = await service.uploadMediaFile(req.file, folder as import('./media.schema').MediaFolder);
  sendCreated(res, asset, 'Media uploaded');
}

// POST /api/v1/media/upload-resized
export async function uploadResized(req: AuthRequest, res: Response): Promise<void> {
  if (!req.file) throw new Error('No file attached');
  const folder = (req.body?.folder as string) || 'blog';
  const name = (req.body?.name as string) || '';
  const result = await service.uploadWithResize(req.file, folder as import('./media.schema').MediaFolder, name);
  sendCreated(res, result, 'Resized images uploaded');
}

