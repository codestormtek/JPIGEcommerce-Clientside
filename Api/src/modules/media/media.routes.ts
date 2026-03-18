import { Router } from 'express';
import multer from 'multer';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import { config } from '../../config';
import { listMediaSchema, createMediaSchema, updateMediaSchema, createFolderSchema, updateFolderSchema, ALLOWED_DOCUMENT_MIME } from './media.schema';
import * as ctrl from './media.controller';

export const mediaRouter = Router();

const ALLOWED_MIME = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/webm',
  ...ALLOWED_DOCUMENT_MIME,
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB for documents
  fileFilter: (_req, file, cb) => {
    cb(null, ALLOWED_MIME.includes(file.mimetype));
  },
});

// ── Folder routes (must be before /:id) ──────────────────────────────────────
mediaRouter.get('/folders',           authenticate, authorize('admin'), asyncHandler(ctrl.listFolders));
mediaRouter.post('/folders',          authenticate, authorize('admin'), validate(createFolderSchema), asyncHandler(ctrl.createFolder));
mediaRouter.patch('/folders/:slug',   authenticate, authorize('admin'), validate(updateFolderSchema), asyncHandler(ctrl.updateFolder));
mediaRouter.delete('/folders/:slug',  authenticate, authorize('admin'), asyncHandler(ctrl.deleteFolder));

// POST   /api/v1/media/upload — upload a file and create asset (admin)
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

