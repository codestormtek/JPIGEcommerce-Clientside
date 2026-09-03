import { Router } from 'express';
import multer from 'multer';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import { config } from '../../config';
import { listFilesSchema, createFileLinkSchema, listByEntitySchema } from './files.schema';
import * as ctrl from './files.controller';

export const filesRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.uploads.maxFileSizeMb * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain', 'text/csv',
    ];
    cb(null, allowed.includes(file.mimetype));
  },
});

// Static sub-routes BEFORE /:id to avoid routing conflicts
// GET /api/v1/files/by-entity/:type/:id
filesRouter.get(
  '/by-entity/:type/:id',
  authenticate,
  authorize('admin'),
  validate(listByEntitySchema, 'query'),
  asyncHandler(ctrl.getByEntity),
);

// DELETE /api/v1/files/links/:linkId
filesRouter.delete(
  '/links/:linkId',
  authenticate,
  authorize('admin'),
  asyncHandler(ctrl.deleteLink),
);

// POST /api/v1/files  — upload a file
filesRouter.post(
  '/',
  authenticate,
  authorize('admin'),
  upload.single('file'),
  asyncHandler(ctrl.uploadFile),
);

// GET /api/v1/files
filesRouter.get(
  '/',
  authenticate,
  authorize('admin'),
  validate(listFilesSchema, 'query'),
  asyncHandler(ctrl.listFiles),
);

// GET /api/v1/files/:id
filesRouter.get(
  '/:id',
  authenticate,
  authorize('admin'),
  asyncHandler(ctrl.getFile),
);

// GET /api/v1/files/:id/download  — serves file inline (PDF) or as attachment
filesRouter.get(
  '/:id/download',
  authenticate,
  authorize('admin'),
  asyncHandler(ctrl.downloadFile),
);

// DELETE /api/v1/files/:id
filesRouter.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  asyncHandler(ctrl.deleteFile),
);

// POST /api/v1/files/:id/links  — associate file with an entity
filesRouter.post(
  '/:id/links',
  authenticate,
  authorize('admin'),
  validate(createFileLinkSchema, 'body'),
  asyncHandler(ctrl.linkFile),
);

