import { Request, Response } from 'express';
import { sendSuccess, sendPaginated, sendNoContent } from '../../utils/apiResponse';
import { ListAuditLogsInput } from './audit-logs.schema';
import * as service from './audit-logs.service';

// GET /api/v1/audit-logs
export async function listAuditLogs(req: Request, res: Response): Promise<void> {
  const result = await service.listAuditLogs(req.query as unknown as ListAuditLogsInput);
  sendPaginated(res, result);
}

// GET /api/v1/audit-logs/:id
export async function getAuditLogById(req: Request, res: Response): Promise<void> {
  const log = await service.getAuditLogById(req.params['id'] as string);
  sendSuccess(res, log);
}

// DELETE /api/v1/audit-logs/:id
export async function deleteAuditLog(req: Request, res: Response): Promise<void> {
  await service.deleteAuditLog(req.params['id'] as string);
  sendNoContent(res);
}

