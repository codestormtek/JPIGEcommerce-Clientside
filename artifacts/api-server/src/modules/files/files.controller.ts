import { Response } from 'express';
import { AuthRequest } from '../../types';
import { sendSuccess, sendCreated, sendNoContent } from '../../utils/apiResponse';
import { ctxFromRequest } from '../../utils/auditLogger';
import type { ListFilesInput, CreateFileLinkInput } from './files.schema';
import * as service from './files.service';

// POST /api/v1/files  (multipart/form-data, field: "file")
export async function uploadFile(req: AuthRequest, res: Response): Promise<void> {
  if (!req.file) throw new Error('No file attached');
  const actorId = req.user?.sub;
  const ctx = ctxFromRequest(req, actorId);
  const stored = await service.uploadFile(req.file, actorId, ctx);
  sendCreated(res, stored, 'File uploaded');
}

// GET /api/v1/files
export async function listFiles(req: AuthRequest, res: Response): Promise<void> {
  const result = await service.listFiles(req.query as unknown as ListFilesInput);
  res.status(200).json({ success: true, data: result.items, meta: { total: result.total, page: result.page, limit: result.limit, totalPages: Math.ceil(result.total / result.limit) } });
}

// GET /api/v1/files/:id
export async function getFile(req: AuthRequest, res: Response): Promise<void> {
  const file = await service.getFileById(req.params['id'] as string);
  sendSuccess(res, file);
}

// GET /api/v1/files/:id/download
export async function downloadFile(req: AuthRequest, res: Response): Promise<void> {
  const { file, stream } = await service.downloadFile(req.params['id'] as string);
  const inline = file.mimeType === 'application/pdf' && req.query['inline'] !== 'false';
  const disposition = inline ? 'inline' : 'attachment';
  res.setHeader('Content-Type', file.mimeType);
  res.setHeader('Content-Disposition', `${disposition}; filename="${file.originalName}"`);
  stream.pipe(res);
}

// DELETE /api/v1/files/:id
export async function deleteFile(req: AuthRequest, res: Response): Promise<void> {
  const actorId = req.user?.sub;
  const ctx = ctxFromRequest(req, actorId);
  await service.deleteFile(req.params['id'] as string, ctx);
  sendNoContent(res);
}

// POST /api/v1/files/:id/links
export async function linkFile(req: AuthRequest, res: Response): Promise<void> {
  const link = await service.linkFileToEntity(req.params['id'] as string, req.body as CreateFileLinkInput);
  sendCreated(res, link, 'File linked');
}

// GET /api/v1/files/by-entity/:type/:id
export async function getByEntity(req: AuthRequest, res: Response): Promise<void> {
  const { type, id } = req.params as { type: string; id: string };
  const tag = req.query['tag'] as string | undefined;
  const links = await service.getFilesByEntity(type, id, tag);
  sendSuccess(res, links);
}

// DELETE /api/v1/files/links/:linkId
export async function deleteLink(req: AuthRequest, res: Response): Promise<void> {
  await service.deleteLink(req.params['linkId'] as string);
  sendNoContent(res);
}

