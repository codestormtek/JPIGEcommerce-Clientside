import prisma from '../../lib/prisma';
import { ListTasksInput, CreateTaskInput, UpdateTaskInput, HistoryQueryInput } from './scheduledTasks.schema';

export async function findTasks(input: ListTasksInput) {
  const { page, limit, search, isEnabled, category, lastStatus, orderBy, order } = input;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { isDeleted: false };

  if (search) {
    where['OR'] = [
      { name: { contains: search, mode: 'insensitive' } },
      { taskKey: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (isEnabled !== undefined) where['isEnabled'] = isEnabled;
  if (category) where['category'] = category;
  if (lastStatus) where['lastStatus'] = lastStatus;

  const [data, total] = await Promise.all([
    prisma.scheduledTask.findMany({
      where,
      orderBy: { [orderBy]: order },
      skip,
      take: limit,
    }),
    prisma.scheduledTask.count({ where }),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function findTaskById(id: string) {
  return prisma.scheduledTask.findFirst({
    where: { id, isDeleted: false },
  });
}

export async function findTaskByKey(taskKey: string) {
  return prisma.scheduledTask.findFirst({
    where: { taskKey, isDeleted: false },
  });
}

export async function createTask(input: CreateTaskInput & { createdBy?: string; nextRunAt?: Date }) {
  const { runOnceAt, startAt, endAt, ...rest } = input;
  return prisma.scheduledTask.create({
    data: {
      ...rest,
      runOnceAt: runOnceAt ? new Date(runOnceAt) : undefined,
      startAt: startAt ? new Date(startAt) : undefined,
      endAt: endAt ? new Date(endAt) : undefined,
    },
  });
}

export async function updateTask(id: string, input: UpdateTaskInput & { updatedBy?: string; nextRunAt?: Date | null }) {
  const { runOnceAt, startAt, endAt, ...rest } = input;
  const data: Record<string, unknown> = { ...rest };
  if (runOnceAt !== undefined) data['runOnceAt'] = runOnceAt ? new Date(runOnceAt) : null;
  if (startAt !== undefined) data['startAt'] = startAt ? new Date(startAt) : null;
  if (endAt !== undefined) data['endAt'] = endAt ? new Date(endAt) : null;

  return prisma.scheduledTask.update({
    where: { id },
    data,
  });
}

export async function softDeleteTask(id: string) {
  return prisma.scheduledTask.update({
    where: { id },
    data: { isDeleted: true, isEnabled: false },
  });
}

export async function setEnabled(id: string, isEnabled: boolean) {
  return prisma.scheduledTask.update({
    where: { id },
    data: { isEnabled },
  });
}

export async function updateAfterRun(id: string, data: {
  lastRunAt: Date;
  nextRunAt: Date | null;
  lastStatus: string;
}) {
  return prisma.scheduledTask.update({
    where: { id },
    data,
  });
}

export async function createExecution(data: {
  scheduledTaskId: string;
  status: string;
  startedAt: Date;
  triggeredByType: string;
  triggeredByUserId?: string;
  workerName?: string;
  attemptNumber?: number;
  correlationId?: string;
}) {
  return prisma.taskExecution.create({ data });
}

export async function updateExecution(id: string, data: {
  status: string;
  completedAt?: Date;
  durationMs?: number;
  message?: string;
  errorMessage?: string;
  errorStack?: string;
}) {
  return prisma.taskExecution.update({ where: { id }, data });
}

export async function findExecutionById(id: string) {
  return prisma.taskExecution.findUnique({
    where: { id },
    include: {
      scheduledTask: { select: { id: true, name: true, taskKey: true } },
      logs: { orderBy: { createdAt: 'asc' } },
    },
  });
}

export async function findExecutionHistory(taskId: string, input: HistoryQueryInput) {
  const { page, limit, status, orderBy, order } = input;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { scheduledTaskId: taskId };
  if (status) where['status'] = status;

  const [data, total] = await Promise.all([
    prisma.taskExecution.findMany({
      where,
      orderBy: { [orderBy]: order },
      skip,
      take: limit,
      select: {
        id: true,
        status: true,
        startedAt: true,
        completedAt: true,
        durationMs: true,
        triggeredByType: true,
        triggeredByUserId: true,
        attemptNumber: true,
        message: true,
        errorMessage: true,
        correlationId: true,
        createdAt: true,
      },
    }),
    prisma.taskExecution.count({ where }),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function hasRunningExecution(taskId: string): Promise<boolean> {
  const count = await prisma.taskExecution.count({
    where: { scheduledTaskId: taskId, status: 'running' },
  });
  return count > 0;
}

export async function createExecutionLog(data: {
  taskExecutionId: string;
  logLevel: string;
  message: string;
  details?: string;
}) {
  return prisma.taskExecutionLog.create({ data });
}

export async function getDistinctCategories(): Promise<string[]> {
  const results = await prisma.scheduledTask.findMany({
    where: { isDeleted: false, category: { not: null } },
    select: { category: true },
    distinct: ['category'],
    orderBy: { category: 'asc' },
  });
  return results.map((r) => r.category).filter(Boolean) as string[];
}
