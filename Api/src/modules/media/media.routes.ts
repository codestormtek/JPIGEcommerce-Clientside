import { Router } from 'express';
import multer from 'multer';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import { config } from '../../config';
import { listMediaSchema, createMediaSchema, updateMediaSchema } from './media.schema';
import * as ctrl from './media.controller';

export const mediaRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.uploads.maxFileSizeMb * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm'];
    cb(null, allowed.includes(file.mimetype));
  },
});

// POST   /api/v1/media/upload — upload a file and create asset (admin) — MUST be before /:id
mediaRouter.post('/upload', authenticate, authorize('admin'), upload.single('file'), asyncHandler(ctrl.uploadMedia));

// POST   /api/v1/media/upload-resized — upload + auto-resize to variants (admin)
mediaRouter.post('/upload-resized', authenticate, authorize('admin'), upload.single('file'), asyncHandler(ctrl.uploadResized));

// GET    /api/v1/media        — list media assets (public)
mediaRouter.get('/', validate(listMediaSchema, 'query'), asyncHandler(ctrl.listMedia));

// GET    /api/v1/media/:id   — get single asset (public)
mediaRouter.get('/:id', asyncHandler(ctrl.getMediaById));

// POST   /api/v1/media       — register a new asset (admin)
mediaRouter.post('/', authenticate, authorize('admin'), validate(createMediaSchema), asyncHandler(ctrl.createMedia));

// PATCH  /api/v1/media/:id   — update asset (admin)
mediaRouter.patch('/:id', authenticate, authorize('admin'), validate(updateMediaSchema), asyncHandler(ctrl.updateMedia));

// DELETE /api/v1/media/:id   — soft-delete asset (admin)
mediaRouter.delete('/:id', authenticate, authorize('admin'), asyncHandler(ctrl.deleteMedia));

