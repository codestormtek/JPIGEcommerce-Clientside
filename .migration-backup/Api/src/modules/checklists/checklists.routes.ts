import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  listChecklistsSchema,
  createChecklistSchema,
  updateChecklistSchema,
  createTaskSchema,
  updateTaskSchema,
  reorderTasksSchema,
  syncChecklistSchema,
} from './checklists.schema';
import * as ctrl from './checklists.controller';

export const checklistsRouter = Router();

// All checklist routes require authentication
checklistsRouter.use(authenticate);

// ─── Checklist CRUD ───────────────────────────────────────────────────────────

checklistsRouter.get('/',    validate(listChecklistsSchema, 'query'), asyncHandler(ctrl.listChecklists));
checklistsRouter.post('/',   validate(createChecklistSchema),         asyncHandler(ctrl.createChecklist));
checklistsRouter.get('/:id',    asyncHandler(ctrl.getChecklist));
checklistsRouter.patch('/:id',  validate(updateChecklistSchema), asyncHandler(ctrl.updateChecklist));
checklistsRouter.delete('/:id', asyncHandler(ctrl.deleteChecklist));

// ─── Sync (full state replacement) ───────────────────────────────────────────

checklistsRouter.post('/:id/sync', validate(syncChecklistSchema), asyncHandler(ctrl.syncChecklist));

// ─── Task sub-routes ──────────────────────────────────────────────────────────

checklistsRouter.post(  '/:id/tasks',           validate(createTaskSchema),   asyncHandler(ctrl.createTask));
checklistsRouter.put(   '/:id/tasks/reorder',   validate(reorderTasksSchema), asyncHandler(ctrl.reorderTasks));
checklistsRouter.patch( '/:id/tasks/:taskId',   validate(updateTaskSchema),   asyncHandler(ctrl.updateTask));
checklistsRouter.delete('/:id/tasks/:taskId',   asyncHandler(ctrl.deleteTask));

