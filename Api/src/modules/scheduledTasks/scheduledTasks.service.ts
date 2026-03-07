import { ApiError } from '../../utils/apiError';
import { AuditContext, logAudit } from '../../utils/auditLogger';
import {
  ListTasksInput, CreateTaskInput, UpdateTaskInput, RunTaskInput, HistoryQueryInput,
} from './scheduledTasks.schema';
import * as repo from './scheduledTasks.repository';
import { computeNextRunAt } from './scheduledTasks.utils';

export async function listTasks(input: ListTasksInput) {
  return repo.findTasks(input);
}

export async function getTask(id: string) {
  const task = await repo.findTaskById(id);
  if (!task) throw ApiError.notFound('ScheduledTask');
  return task;
}

export async function createTask(input: CreateTaskInput, ctx?: AuditContext) {
  const existing = await repo.findTaskByKey(input.taskKey);
  if (existing) throw ApiError.conflict(`Task with key "${input.taskKey}" already exists`);

  const nextRunAt = computeNextRunAt(input.scheduleType, input.cronExpression, input.runOnceAt, input.intervalSeconds, input.timezone);

  const task = await repo.createTask({
    ...input,
    createdBy: ctx?.actorId,
    nextRunAt: nextRunAt ?? undefined,
  });

  logAudit({
    action: 'SCHEDULED_TASK_CREATED',
    entityType: 'ScheduledTask',
    entityId: task.id,
    afterJson: task as unknown as Record<string, unknown>,
    ctx,
  });

  return task;
}

export async function updateTask(id: string, input: UpdateTaskInput, ctx?: AuditContext) {
  const before = await getTask(id);

  const scheduleType = input.scheduleType ?? before.scheduleType;
  const cronExpression = input.cronExpression ?? before.cronExpression;
  const runOnceAt = input.runOnceAt ?? (before.runOnceAt ? before.runOnceAt.toISOString() : undefined);
  const intervalSeconds = input.intervalSeconds ?? before.intervalSeconds;

  const tz = input.timezone ?? before.timezone;
  const nextRunAt = computeNextRunAt(scheduleType, cronExpression, runOnceAt, intervalSeconds, tz);

  const task = await repo.updateTask(id, {
    ...input,
    updatedBy: ctx?.actorId,
    nextRunAt: nextRunAt ?? null,
  });

  logAudit({
    action: 'SCHEDULED_TASK_UPDATED',
    entityType: 'ScheduledTask',
    entityId: id,
    beforeJson: before as unknown as Record<string, unknown>,
    afterJson: task as unknown as Record<string, unknown>,
    ctx,
  });

  return task;
}

export async function deleteTask(id: string, ctx?: AuditContext) {
  await getTask(id);
  await repo.softDeleteTask(id);
  logAudit({
    action: 'SCHEDULED_TASK_DELETED',
    entityType: 'ScheduledTask',
    entityId: id,
    ctx,
  });
}

export async function enableTask(id: string, ctx?: AuditContext) {
  const task = await getTask(id);

  const nextRunAt = computeNextRunAt(
    task.scheduleType,
    task.cronExpression,
    task.runOnceAt ? task.runOnceAt.toISOString() : undefined,
    task.intervalSeconds,
    task.timezone,
  );

  const updated = await repo.updateTask(id, {
    isEnabled: true,
    updatedBy: ctx?.actorId,
    nextRunAt: nextRunAt ?? null,
  });

  logAudit({
    action: 'SCHEDULED_TASK_ENABLED',
    entityType: 'ScheduledTask',
    entityId: id,
    ctx,
  });

  return updated;
}

export async function disableTask(id: string, ctx?: AuditContext) {
  await getTask(id);
  const updated = await repo.setEnabled(id, false);
  logAudit({
    action: 'SCHEDULED_TASK_DISABLED',
    entityType: 'ScheduledTask',
    entityId: id,
    ctx,
  });
  return updated;
}

export async function runTask(id: string, _input: RunTaskInput, ctx?: AuditContext) {
  const task = await getTask(id);

  if (!task.allowConcurrentRuns) {
    const running = await repo.hasRunningExecution(id);
    if (running) throw ApiError.conflict('Task is already running');
  }

  logAudit({
    action: 'SCHEDULED_TASK_MANUAL_RUN',
    entityType: 'ScheduledTask',
    entityId: id,
    ctx,
  });

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { runTaskManually } = require('../../jobs/taskRunner');
  runTaskManually(id, ctx?.actorId);

  return { taskId: id, status: 'queued' };
}

export async function getHistory(taskId: string, input: HistoryQueryInput) {
  await getTask(taskId);
  return repo.findExecutionHistory(taskId, input);
}

export async function getExecutionDetail(executionId: string) {
  const execution = await repo.findExecutionById(executionId);
  if (!execution) throw ApiError.notFound('TaskExecution');
  return execution;
}

export function getTaskTypes() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getAllHandlers } = require('../../jobs/taskHandlerRegistry');
    return getAllHandlers().map((h: { key: string; name: string; description: string; category: string; defaultCron: string }) => ({
      key: h.key,
      name: h.name,
      description: h.description,
      category: h.category,
      defaultCron: h.defaultCron,
    }));
  } catch {
    return [];
  }
}

export function getTimezones() {
  const common = [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Anchorage',
    'Pacific/Honolulu',
    'America/Toronto',
    'America/Vancouver',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Europe/Rome',
    'Europe/Madrid',
    'Europe/Amsterdam',
    'Europe/Moscow',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Asia/Hong_Kong',
    'Asia/Singapore',
    'Asia/Kolkata',
    'Asia/Dubai',
    'Australia/Sydney',
    'Australia/Melbourne',
    'Pacific/Auckland',
  ];
  return common;
}

export async function getCategories() {
  return repo.getDistinctCategories();
}
