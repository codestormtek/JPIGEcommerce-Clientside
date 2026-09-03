import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import { createExportSchema, listExportsSchema } from './exports.schema';
import * as ctrl from './exports.controller';

export const exportsRouter = Router();

// All export routes are admin-only

// POST /api/v1/exports  — create an export job
exportsRouter.post(
  '/',
  authenticate,
  authorize('admin'),
  validate(createExportSchema, 'body'),
  asyncHandler(ctrl.createExport),
);

// GET /api/v1/exports  — list export jobs
exportsRouter.get(
  '/',
  authenticate,
  authorize('admin'),
  validate(listExportsSchema, 'query'),
  asyncHandler(ctrl.listExports),
);

// GET /api/v1/exports/:id  — poll status
exportsRouter.get(
  '/:id',
  authenticate,
  authorize('admin'),
  asyncHandler(ctrl.getExport),
);

// GET /api/v1/exports/:id/download  — stream completed file
exportsRouter.get(
  '/:id/download',
  authenticate,
  authorize('admin'),
  asyncHandler(ctrl.downloadExport),
);

