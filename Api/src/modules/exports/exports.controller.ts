import { Response } from 'express';
import { AuthRequest } from '../../types';
import { sendCreated, sendSuccess } from '../../utils/apiResponse';
import { ctxFromRequest } from '../../utils/auditLogger';
import type { CreateExportInput, ListExportsInput } from './exports.schema';
import * as service from './exports.service';

const MIME_MAP: Record<string, string> = {
  csv:  'text/csv',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf:  'application/pdf',
  txt:  'text/plain',
};

// POST /api/v1/exports
export async function createExport(req: AuthRequest, res: Response): Promise<void> {
  const actorId = req.user?.sub;
  const ctx = ctxFromRequest(req, actorId);
  const job = await service.createExport(req.body as CreateExportInput, actorId, ctx);
  sendCreated(res, job, 'Export job queued');
}

// GET /api/v1/exports
export async function listExports(req: AuthRequest, res: Response): Promise<void> {
  const result = await service.listExports(req.query as unknown as ListExportsInput);
  res.status(200).json({ success: true, data: result.items, meta: { total: result.total, page: result.page, limit: result.limit, totalPages: Math.ceil(result.total / result.limit) } });
}

// GET /api/v1/exports/:id
export async function getExport(req: AuthRequest, res: Response): Promise<void> {
  const job = await service.getExport(req.params['id'] as string);
  sendSuccess(res, job);
}

// GET /api/v1/exports/:id/download
export async function downloadExport(req: AuthRequest, res: Response): Promise<void> {
  const { job, stream } = await service.downloadExport(req.params['id'] as string);
  const ext = job.storageKey!.split('.').pop() ?? 'bin';
  const mimeType = MIME_MAP[ext] ?? 'application/octet-stream';
  const inline = ext === 'pdf' && req.query['inline'] !== 'false';
  const disposition = inline ? 'inline' : 'attachment';
  const filename = `export-${job.resource}-${job.id.slice(0, 8)}.${ext}`;

  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Disposition', `${disposition}; filename="${filename}"`);
  stream.pipe(res);
}

