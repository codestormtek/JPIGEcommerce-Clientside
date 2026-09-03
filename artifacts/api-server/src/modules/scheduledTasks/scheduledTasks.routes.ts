import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  listTasksSchema, createTaskSchema, updateTaskSchema, runTaskSchema, historyQuerySchema,
} from './scheduledTasks.schema';
import * as ctrl from './scheduledTasks.controller';

export const scheduledTasksRouter = Router();

scheduledTasksRouter.get(
  '/meta/task-types',
  authenticate,
  authorize('admin'),
  asyncHandler(ctrl.getTaskTypes),
);

scheduledTasksRouter.get(
  '/meta/timezones',
  authenticate,
  authorize('admin'),
  asyncHandler(ctrl.getTimezones),
);

scheduledTasksRouter.get(
  '/executions/:executionId',
  authenticate,
  authorize('admin'),
  asyncHandler(ctrl.getExecutionDetail),
);

scheduledTasksRouter.get(
  '/',
  authenticate,
  authorize('admin'),
  validate(listTasksSchema, 'query'),
  asyncHandler(ctrl.listTasks),
);

scheduledTasksRouter.get(
  '/:id',
  authenticate,
  authorize('admin'),
  asyncHandler(ctrl.getTask),
);

scheduledTasksRouter.post(
  '/',
  authenticate,
  authorize('admin'),
  validate(createTaskSchema),
  asyncHandler(ctrl.createTask),
);

scheduledTasksRouter.patch(
  '/:id',
  authenticate,
  authorize('admin'),
  validate(updateTaskSchema),
  asyncHandler(ctrl.updateTask),
);

scheduledTasksRouter.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  asyncHandler(ctrl.deleteTask),
);

scheduledTasksRouter.patch(
  '/:id/enable',
  authenticate,
  authorize('admin'),
  asyncHandler(ctrl.enableTask),
);

scheduledTasksRouter.patch(
  '/:id/disable',
  authenticate,
  authorize('admin'),
  asyncHandler(ctrl.disableTask),
);

scheduledTasksRouter.post(
  '/:id/run',
  authenticate,
  authorize('admin'),
  validate(runTaskSchema),
  asyncHandler(ctrl.runTask),
);

scheduledTasksRouter.get(
  '/:id/history',
  authenticate,
  authorize('admin'),
  validate(historyQuerySchema, 'query'),
  asyncHandler(ctrl.getHistory),
);
