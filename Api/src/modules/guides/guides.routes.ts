import { Router } from 'express';
import multer from 'multer';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  createSectionSchema, updateSectionSchema, reorderSchema,
  createBlockSchema, updateBlockSchema,
  createStepSchema, updateStepSchema,
} from './guides.schema';
import * as ctrl from './guides.controller';

export const guidesRouter = Router();

// All guide routes are admin-only (internal operations manual)
guidesRouter.use(authenticate, authorize('admin'));

const ALLOWED_IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
  fileFilter: (_req, file, cb) => cb(null, ALLOWED_IMAGE_MIME.has(file.mimetype)),
});

// ─── Tree ─────────────────────────────────────────────────────────────────────
guidesRouter.get('/', asyncHandler(ctrl.getGuideTree));

// ─── Sections ─────────────────────────────────────────────────────────────────
guidesRouter.post('/sections', validate(createSectionSchema), asyncHandler(ctrl.createSection));
guidesRouter.post('/sections/reorder', validate(reorderSchema), asyncHandler(ctrl.reorderSections));
guidesRouter.patch('/sections/:id', validate(updateSectionSchema), asyncHandler(ctrl.updateSection));
guidesRouter.delete('/sections/:id', asyncHandler(ctrl.deleteSection));

// ─── Blocks ───────────────────────────────────────────────────────────────────
guidesRouter.post('/sections/:id/blocks', validate(createBlockSchema), asyncHandler(ctrl.createBlock));
guidesRouter.post('/sections/:id/blocks/reorder', validate(reorderSchema), asyncHandler(ctrl.reorderBlocks));
guidesRouter.patch('/blocks/:blockId', validate(updateBlockSchema), asyncHandler(ctrl.updateBlock));
guidesRouter.delete('/blocks/:blockId', asyncHandler(ctrl.deleteBlock));

// ─── Steps ────────────────────────────────────────────────────────────────────
guidesRouter.post('/blocks/:blockId/steps', validate(createStepSchema), asyncHandler(ctrl.createStep));
guidesRouter.post('/blocks/:blockId/steps/reorder', validate(reorderSchema), asyncHandler(ctrl.reorderSteps));
guidesRouter.patch('/steps/:stepId', validate(updateStepSchema), asyncHandler(ctrl.updateStep));
guidesRouter.delete('/steps/:stepId', asyncHandler(ctrl.deleteStep));

// ─── Acknowledgments (mark-as-read) ───────────────────────────────────────────
guidesRouter.get('/acks/me', asyncHandler(ctrl.getMyAcks));
guidesRouter.get('/acks/report', asyncHandler(ctrl.getAckReport));
guidesRouter.post('/sections/:id/ack', asyncHandler(ctrl.ackSection));
guidesRouter.delete('/sections/:id/ack', asyncHandler(ctrl.unackSection));

// ─── Image upload ─────────────────────────────────────────────────────────────
guidesRouter.post('/upload', upload.single('file'), asyncHandler(ctrl.uploadImage));
