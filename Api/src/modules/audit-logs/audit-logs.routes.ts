import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import { listAuditLogsSchema } from './audit-logs.schema';
import * as ctrl from './audit-logs.controller';

export const auditLogsRouter = Router();

// All audit log routes are admin-only (read-only)
auditLogsRouter.use(authenticate, authorize('admin'));

// GET /api/v1/audit-logs
auditLogsRouter.get('/', validate(listAuditLogsSchema, 'query'), asyncHandler(ctrl.listAuditLogs));

// GET /api/v1/audit-logs/:id
auditLogsRouter.get('/:id', asyncHandler(ctrl.getAuditLogById));

