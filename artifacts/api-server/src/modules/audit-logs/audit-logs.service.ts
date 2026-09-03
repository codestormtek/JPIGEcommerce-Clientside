import { ApiError } from '../../utils/apiError';
import { ListAuditLogsInput } from './audit-logs.schema';
import * as repo from './audit-logs.repository';

export async function listAuditLogs(input: ListAuditLogsInput) {
  return repo.findAuditLogs(input);
}

export async function getAuditLogById(id: string) {
  const log = await repo.findAuditLogById(id);
  if (!log) throw ApiError.notFound('Audit log');
  return log;
}

export async function deleteAuditLog(id: string) {
  const log = await repo.findAuditLogById(id);
  if (!log) throw ApiError.notFound('Audit log');
  return repo.deleteAuditLog(id);
}

