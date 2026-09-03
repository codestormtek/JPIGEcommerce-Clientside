import prisma from '../../lib/prisma';
import { ListChecklistsInput, CreateChecklistInput, UpdateChecklistInput, CreateTaskInput, UpdateTaskInput, ReorderTasksInput, SyncChecklistInput } from './checklists.schema';
import { PaginatedResult } from '../../types';

// ─── Checklists ───────────────────────────────────────────────────────────────

export async function listChecklists(
  userId: string,
  input: ListChecklistsInput,
): Promise<PaginatedResult<object>> {
  const { page, limit, search, orderBy, order } = input;
  const skip = (page - 1) * limit;

  const where = {
    userId,
    ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.checklist.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [orderBy]: order },
      include: { tasks: { orderBy: { position: 'asc' } } },
    }),
    prisma.checklist.count({ where }),
  ]);

  return { data: rows, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getChecklist(id: string, userId: string) {
  return prisma.checklist.findFirst({
    where: { id, userId },
    include: { tasks: { orderBy: { position: 'asc' } } },
  });
}

export async function createChecklist(userId: string, input: CreateChecklistInput) {
  return prisma.checklist.create({
    data: { userId, name: input.name },
    include: { tasks: { orderBy: { position: 'asc' } } },
  });
}

export async function updateChecklist(id: string, userId: string, input: UpdateChecklistInput) {
  return prisma.checklist.update({
    where: { id },
    data: { ...input, updatedAt: new Date() },
    include: { tasks: { orderBy: { position: 'asc' } } },
  });
}

export async function deleteChecklist(id: string, userId: string) {
  await prisma.checklist.deleteMany({ where: { id, userId } });
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export async function createTask(checklistId: string, input: CreateTaskInput) {
  return prisma.checklistTask.create({ data: { checklistId, ...input } });
}

export async function updateTask(id: string, input: UpdateTaskInput) {
  return prisma.checklistTask.update({ where: { id }, data: input });
}

export async function deleteTask(id: string) {
  return prisma.checklistTask.delete({ where: { id } });
}

export async function reorderTasks(input: ReorderTasksInput) {
  await Promise.all(
    input.tasks.map((t) =>
      prisma.checklistTask.update({ where: { id: t.id }, data: { position: t.position } }),
    ),
  );
}

// ─── Sync (replace name + tasks in one transaction) ──────────────────────────

export async function syncChecklist(id: string, userId: string, input: SyncChecklistInput) {
  const { name, tasks } = input;

  return prisma.$transaction(async (tx) => {
    // Update checklist name
    await tx.checklist.update({ where: { id }, data: { name, updatedAt: new Date() } });

    // Delete all existing tasks and recreate (simpler than upsert for reorder)
    await tx.checklistTask.deleteMany({ where: { checklistId: id } });
    if (tasks.length > 0) {
      await tx.checklistTask.createMany({
        data: tasks.map((t, i) => ({
          checklistId: id,
          text: t.text,
          done: t.done,
          position: t.position ?? i,
        })),
      });
    }

    return tx.checklist.findUnique({
      where: { id },
      include: { tasks: { orderBy: { position: 'asc' } } },
    });
  });
}

