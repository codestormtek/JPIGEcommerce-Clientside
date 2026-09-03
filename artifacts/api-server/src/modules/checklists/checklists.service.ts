import { ApiError } from '../../utils/apiError';
import * as repo from './checklists.repository';
import type {
  ListChecklistsInput, CreateChecklistInput, UpdateChecklistInput,
  CreateTaskInput, UpdateTaskInput, ReorderTasksInput, SyncChecklistInput,
} from './checklists.schema';

// ─── Checklists ───────────────────────────────────────────────────────────────

export const listChecklists = (userId: string, input: ListChecklistsInput) =>
  repo.listChecklists(userId, input);

export const getChecklist = async (id: string, userId: string) => {
  const checklist = await repo.getChecklist(id, userId);
  if (!checklist) throw ApiError.notFound('Checklist');
  return checklist;
};

export const createChecklist = (userId: string, input: CreateChecklistInput) =>
  repo.createChecklist(userId, input);

export const updateChecklist = async (id: string, userId: string, input: UpdateChecklistInput) => {
  await getChecklist(id, userId); // ensure ownership
  return repo.updateChecklist(id, userId, input);
};

export const deleteChecklist = async (id: string, userId: string) => {
  await getChecklist(id, userId); // ensure ownership
  await repo.deleteChecklist(id, userId);
};

// ─── Tasks ────────────────────────────────────────────────────────────────────

export const createTask = async (checklistId: string, userId: string, input: CreateTaskInput) => {
  await getChecklist(checklistId, userId); // ensure ownership
  return repo.createTask(checklistId, input);
};

export const updateTask = (id: string, input: UpdateTaskInput) =>
  repo.updateTask(id, input);

export const deleteTask = (id: string) =>
  repo.deleteTask(id);

export const reorderTasks = (input: ReorderTasksInput) =>
  repo.reorderTasks(input);

// ─── Sync ─────────────────────────────────────────────────────────────────────

export const syncChecklist = async (id: string, userId: string, input: SyncChecklistInput) => {
  await getChecklist(id, userId); // ensure ownership
  return repo.syncChecklist(id, userId, input);
};

