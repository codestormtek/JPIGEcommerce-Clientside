import { randomUUID } from 'crypto';
import prisma from '../lib/prisma';
import { logger } from '../utils/logger';
import { getHandler, getAllHandlers } from './taskHandlerRegistry';
import { computeNextRunAt } from '../modules/scheduledTasks/scheduledTasks.utils';

async function executeTask(
  taskId: string,
  taskKey: string,
  triggeredByType: 'scheduled' | 'manual',
  triggeredByUserId?: string,
  attemptNumber = 1,
): Promise<void> {
  const handlerMeta = getHandler(taskKey);
  if (!handlerMeta) {
    logger.warn(`taskRunner: no handler registered for taskKey="${taskKey}"`);
    return;
  }

  const correlationId = randomUUID();
  const execution = await prisma.taskExecution.create({
    data: {
      scheduledTaskId: taskId,
      status: 'running',
      startedAt: new Date(),
      triggeredByType,
      triggeredByUserId: triggeredByUserId ?? null,
      workerName: `api-${process.pid}`,
      attemptNumber,
      correlationId,
    },
  });

  const startTime = Date.now();

  try {
    await handlerMeta.handler();
    const durationMs = Date.now() - startTime;

    await prisma.taskExecution.update({
      where: { id: execution.id },
      data: {
        status: 'succeeded',
        completedAt: new Date(),
        durationMs,
        message: 'Completed successfully',
      },
    });

    await prisma.scheduledTask.update({
      where: { id: taskId },
      data: {
        lastRunAt: new Date(),
        lastStatus: 'succeeded',
      },
    });

    await prisma.taskExecutionLog.create({
      data: {
        taskExecutionId: execution.id,
        logLevel: 'info',
        message: `Task "${taskKey}" completed in ${durationMs}ms`,
      },
    });
  } catch (err: unknown) {
    const durationMs = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorStack = err instanceof Error ? err.stack ?? '' : '';

    await prisma.taskExecution.update({
      where: { id: execution.id },
      data: {
        status: 'failed',
        completedAt: new Date(),
        durationMs,
        errorMessage,
        errorStack,
      },
    });

    await prisma.scheduledTask.update({
      where: { id: taskId },
      data: {
        lastRunAt: new Date(),
        lastStatus: 'failed',
      },
    });

    await prisma.taskExecutionLog.create({
      data: {
        taskExecutionId: execution.id,
        logLevel: 'error',
        message: `Task "${taskKey}" failed: ${errorMessage}`,
        details: errorStack,
      },
    });

    const task = await prisma.scheduledTask.findUnique({ where: { id: taskId } });
    if (task && task.retryMaxAttempts > 0 && attemptNumber < task.retryMaxAttempts) {
      const delayMs = (task.retryDelaySeconds ?? 60) * 1000;
      logger.info(`taskRunner: scheduling retry ${attemptNumber + 1} for "${taskKey}" in ${delayMs}ms`);

      await prisma.taskExecution.update({
        where: { id: execution.id },
        data: { status: 'retrying' },
      });

      setTimeout(() => {
        executeTask(taskId, taskKey, triggeredByType, triggeredByUserId, attemptNumber + 1).catch(
          (e) => logger.error(`taskRunner: retry failed for "${taskKey}"`, { err: e }),
        );
      }, delayMs);
    }

    logger.error(`taskRunner: task "${taskKey}" failed`, { err });
  }
}

export async function runTaskManually(taskId: string, userId?: string): Promise<void> {
  const task = await prisma.scheduledTask.findUnique({ where: { id: taskId } });
  if (!task || task.isDeleted) {
    throw new Error('Task not found');
  }

  const handlerMeta = getHandler(task.taskKey);
  if (!handlerMeta) {
    throw new Error(`No handler registered for taskKey="${task.taskKey}"`);
  }

  executeTask(taskId, task.taskKey, 'manual', userId).catch((e) =>
    logger.error(`taskRunner: manual run failed for "${task.taskKey}"`, { err: e }),
  );
}

function advanceNextRunAt(task: {
  scheduleType: string;
  cronExpression: string | null;
  runOnceAt: Date | null;
  intervalSeconds: number | null;
  timezone: string;
}): { nextRunAt: Date | null; disable: boolean } {
  if (task.scheduleType === 'once') {
    return { nextRunAt: null, disable: true };
  }
  const next = computeNextRunAt(
    task.scheduleType,
    task.cronExpression,
    task.runOnceAt ? task.runOnceAt.toISOString() : null,
    task.intervalSeconds,
    task.timezone,
  );
  return { nextRunAt: next, disable: false };
}

export async function pollAndRunDueTasks(): Promise<void> {
  const now = new Date();

  const dueTasks = await prisma.scheduledTask.findMany({
    where: {
      isEnabled: true,
      isDeleted: false,
      nextRunAt: { lte: now },
      AND: [
        { OR: [{ startAt: null }, { startAt: { lte: now } }] },
        { OR: [{ endAt: null }, { endAt: { gt: now } }] },
      ],
    },
  });

  for (const task of dueTasks) {
    const handlerMeta = getHandler(task.taskKey);
    if (!handlerMeta) {
      logger.warn(`taskRunner: skipping task "${task.name}" — no handler for key "${task.taskKey}"`);
      continue;
    }

    if (!task.allowConcurrentRuns) {
      const runningExecution = await prisma.taskExecution.findFirst({
        where: {
          scheduledTaskId: task.id,
          status: 'running',
        },
      });
      if (runningExecution) {
        logger.info(`taskRunner: skipping "${task.name}" — concurrent run in progress`);

        await prisma.taskExecution.create({
          data: {
            scheduledTaskId: task.id,
            status: 'skipped',
            startedAt: now,
            completedAt: now,
            durationMs: 0,
            triggeredByType: 'scheduled',
            workerName: `api-${process.pid}`,
            message: 'Skipped: concurrent run not allowed',
          },
        });

        const { nextRunAt, disable } = advanceNextRunAt(task);
        await prisma.scheduledTask.update({
          where: { id: task.id },
          data: disable ? { isEnabled: false, nextRunAt: null } : { nextRunAt },
        });
        continue;
      }
    }

    const { nextRunAt, disable } = advanceNextRunAt(task);
    await prisma.scheduledTask.update({
      where: { id: task.id },
      data: disable ? { isEnabled: false, nextRunAt: null } : { nextRunAt },
    });

    executeTask(task.id, task.taskKey, 'scheduled').catch((e) =>
      logger.error(`taskRunner: execution failed for "${task.taskKey}"`, { err: e }),
    );
  }
}

export async function seedScheduledTasks(): Promise<void> {
  const handlers = getAllHandlers();

  for (const meta of handlers) {
    const existing = await prisma.scheduledTask.findUnique({
      where: { taskKey: meta.key },
    });

    if (!existing) {
      const nextRunAt = computeNextRunAt('cron', meta.defaultCron, null, null, 'UTC');
      await prisma.scheduledTask.create({
        data: {
          name: meta.name,
          taskKey: meta.key,
          description: meta.description,
          category: meta.category,
          scheduleType: 'cron',
          cronExpression: meta.defaultCron,
          timezone: 'UTC',
          isEnabled: true,
          nextRunAt,
          retryMaxAttempts: 0,
          retryDelaySeconds: 60,
          timeoutSeconds: 300,
          allowConcurrentRuns: false,
        },
      });
      logger.info(`seedScheduledTasks: created task "${meta.name}" (${meta.key})`);
    }
  }
}
