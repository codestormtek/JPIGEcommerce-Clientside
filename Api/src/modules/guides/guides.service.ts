import prisma from '../../lib/prisma';
import { ApiError } from '../../utils/apiError';
import { uploadMediaFile } from '../media/media.service';
import {
  CreateSectionInput, UpdateSectionInput,
  CreateBlockInput, UpdateBlockInput,
  CreateStepInput, UpdateStepInput,
} from './guides.schema';

const blockInclude = {
  steps: { orderBy: { sortOrder: 'asc' as const } },
};

// ─── Tree ─────────────────────────────────────────────────────────────────────

export async function getGuideTree() {
  const sections = await prisma.guideSection.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    include: {
      blocks: { orderBy: { sortOrder: 'asc' }, include: blockInclude },
    },
  });

  // Assemble nested tree from the flat list
  type Node = (typeof sections)[number] & { children: Node[] };
  const byId = new Map<string, Node>();
  sections.forEach((s) => byId.set(s.id, { ...s, children: [] }));
  const roots: Node[] = [];
  byId.forEach((node) => {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

// ─── Sections ─────────────────────────────────────────────────────────────────

async function nextSectionOrder(parentId: string | null) {
  const max = await prisma.guideSection.aggregate({
    where: { parentId },
    _max: { sortOrder: true },
  });
  return (max._max.sortOrder ?? -1) + 1;
}

export async function createSection(input: CreateSectionInput) {
  const parentId = input.parentId ?? null;
  if (parentId) {
    const parent = await prisma.guideSection.findUnique({ where: { id: parentId } });
    if (!parent) throw ApiError.notFound('Parent section not found');
  }
  return prisma.guideSection.create({
    data: {
      title: input.title,
      description: input.description ?? null,
      icon: input.icon ?? null,
      parentId,
      sortOrder: input.sortOrder ?? (await nextSectionOrder(parentId)),
      isPublished: input.isPublished ?? true,
      isSafetyCritical: input.isSafetyCritical ?? false,
    },
  });
}

export async function updateSection(id: string, input: UpdateSectionInput) {
  const section = await prisma.guideSection.findUnique({ where: { id } });
  if (!section) throw ApiError.notFound('Section not found');

  const data = {
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.icon !== undefined ? { icon: input.icon } : {}),
    ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
    ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
    ...(input.isPublished !== undefined ? { isPublished: input.isPublished } : {}),
    ...(input.isSafetyCritical !== undefined ? { isSafetyCritical: input.isSafetyCritical } : {}),
  };

  if (input.parentId === undefined || input.parentId === null) {
    return prisma.guideSection.update({ where: { id }, data });
  }

  if (input.parentId === id) throw ApiError.badRequest('A section cannot be its own parent');

  // Validate ancestry and write atomically (serializable) so concurrent
  // reparent operations cannot race each other into a cycle.
  return prisma.$transaction(async (tx) => {
    let cursor: string | null = input.parentId!;
    while (cursor) {
      if (cursor === id) throw ApiError.badRequest('Cannot move a section under its own descendant');
      const p: { parentId: string | null } | null = await tx.guideSection.findUnique({
        where: { id: cursor }, select: { parentId: true },
      });
      if (!p) throw ApiError.notFound('Parent section not found');
      cursor = p.parentId;
    }
    // Append at the end of the new parent's children
    const max = await tx.guideSection.aggregate({ where: { parentId: input.parentId! }, _max: { sortOrder: true } });
    return tx.guideSection.update({
      where: { id },
      data: { ...data, sortOrder: input.sortOrder ?? (max._max.sortOrder ?? -1) + 1 },
    });
  }, { isolationLevel: 'Serializable' });
}

export async function deleteSection(id: string) {
  const section = await prisma.guideSection.findUnique({ where: { id } });
  if (!section) throw ApiError.notFound('Section not found');
  return prisma.guideSection.delete({ where: { id } }); // cascades to children/blocks/steps
}

/** Ensure `ids` is an exact, duplicate-free permutation of `current`. */
function assertExactPermutation(ids: string[], current: string[], label: string) {
  const given = new Set(ids);
  if (given.size !== ids.length) throw ApiError.badRequest(`Duplicate ids in ${label} reorder list`);
  const cur = new Set(current);
  if (given.size !== cur.size || ![...given].every((id) => cur.has(id))) {
    throw ApiError.badRequest(`Reorder list must contain exactly all ${label} of the same parent`);
  }
}

export async function reorderSections(ids: string[]) {
  await prisma.$transaction(async (tx) => {
    const first = await tx.guideSection.findUnique({ where: { id: ids[0]! }, select: { parentId: true } });
    if (!first) throw ApiError.notFound('Section not found');
    const siblings = await tx.guideSection.findMany({ where: { parentId: first.parentId }, select: { id: true } });
    assertExactPermutation(ids, siblings.map((s) => s.id), 'sibling sections');
    for (let i = 0; i < ids.length; i++) {
      await tx.guideSection.update({ where: { id: ids[i]! }, data: { sortOrder: i } });
    }
  }, { isolationLevel: 'Serializable' });
}

// ─── Blocks ───────────────────────────────────────────────────────────────────

export async function createBlock(sectionId: string, input: CreateBlockInput) {
  const section = await prisma.guideSection.findUnique({ where: { id: sectionId } });
  if (!section) throw ApiError.notFound('Section not found');
  const max = await prisma.guideBlock.aggregate({ where: { sectionId }, _max: { sortOrder: true } });
  return prisma.guideBlock.create({
    data: {
      sectionId,
      type: input.type ?? 'text',
      title: input.title ?? null,
      body: input.body ?? null,
      imageUrl: input.imageUrl ?? null,
      imageCaption: input.imageCaption ?? null,
      sortOrder: input.sortOrder ?? (max._max.sortOrder ?? -1) + 1,
    },
    include: blockInclude,
  });
}

export async function updateBlock(blockId: string, input: UpdateBlockInput) {
  const block = await prisma.guideBlock.findUnique({ where: { id: blockId } });
  if (!block) throw ApiError.notFound('Block not found');
  return prisma.guideBlock.update({
    where: { id: blockId },
    data: {
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.body !== undefined ? { body: input.body } : {}),
      ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
      ...(input.imageCaption !== undefined ? { imageCaption: input.imageCaption } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
    },
    include: blockInclude,
  });
}

export async function deleteBlock(blockId: string) {
  const block = await prisma.guideBlock.findUnique({ where: { id: blockId } });
  if (!block) throw ApiError.notFound('Block not found');
  return prisma.guideBlock.delete({ where: { id: blockId } });
}

export async function reorderBlocks(sectionId: string, ids: string[]) {
  await prisma.$transaction(async (tx) => {
    const blocks = await tx.guideBlock.findMany({ where: { sectionId }, select: { id: true } });
    assertExactPermutation(ids, blocks.map((b) => b.id), 'blocks');
    for (let i = 0; i < ids.length; i++) {
      await tx.guideBlock.update({ where: { id: ids[i]! }, data: { sortOrder: i } });
    }
  }, { isolationLevel: 'Serializable' });
}

// ─── Steps ────────────────────────────────────────────────────────────────────

export async function createStep(blockId: string, input: CreateStepInput) {
  const block = await prisma.guideBlock.findUnique({ where: { id: blockId } });
  if (!block) throw ApiError.notFound('Block not found');
  const max = await prisma.guideStep.aggregate({ where: { blockId }, _max: { sortOrder: true } });
  return prisma.guideStep.create({
    data: {
      blockId,
      text: input.text,
      imageUrl: input.imageUrl ?? null,
      imageCaption: input.imageCaption ?? null,
      sortOrder: input.sortOrder ?? (max._max.sortOrder ?? -1) + 1,
    },
  });
}

export async function updateStep(stepId: string, input: UpdateStepInput) {
  const step = await prisma.guideStep.findUnique({ where: { id: stepId } });
  if (!step) throw ApiError.notFound('Step not found');
  return prisma.guideStep.update({
    where: { id: stepId },
    data: {
      ...(input.text !== undefined ? { text: input.text } : {}),
      ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
      ...(input.imageCaption !== undefined ? { imageCaption: input.imageCaption } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
    },
  });
}

export async function deleteStep(stepId: string) {
  const step = await prisma.guideStep.findUnique({ where: { id: stepId } });
  if (!step) throw ApiError.notFound('Step not found');
  return prisma.guideStep.delete({ where: { id: stepId } });
}

export async function reorderSteps(blockId: string, ids: string[]) {
  await prisma.$transaction(async (tx) => {
    const steps = await tx.guideStep.findMany({ where: { blockId }, select: { id: true } });
    assertExactPermutation(ids, steps.map((s) => s.id), 'steps');
    for (let i = 0; i < ids.length; i++) {
      await tx.guideStep.update({ where: { id: ids[i]! }, data: { sortOrder: i } });
    }
  }, { isolationLevel: 'Serializable' });
}

// ─── Acknowledgments (mark-as-read / training compliance) ────────────────────

export async function ackSection(userId: string, sectionId: string) {
  const section = await prisma.guideSection.findUnique({ where: { id: sectionId } });
  if (!section) throw ApiError.notFound('Section not found');
  return prisma.guideSectionAck.upsert({
    where: { userId_sectionId: { userId, sectionId } },
    update: {}, // idempotent — keep the original readAt
    create: { userId, sectionId },
  });
}

export async function unackSection(userId: string, sectionId: string) {
  await prisma.guideSectionAck.deleteMany({ where: { userId, sectionId } });
}

export async function getMyAcks(userId: string) {
  return prisma.guideSectionAck.findMany({
    where: { userId },
    select: { sectionId: true, readAt: true },
  });
}

/**
 * Completion report: every active admin user × every published section,
 * with per-user progress and a safety-critical breakdown.
 */
export async function getAckReport() {
  const [sections, users, acks] = await Promise.all([
    prisma.guideSection.findMany({
      where: { isPublished: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, parentId: true, title: true, isSafetyCritical: true },
    }),
    prisma.siteUser.findMany({
      where: { role: 'admin', isActive: true, isDeleted: false },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      select: { id: true, firstName: true, lastName: true, emailAddress: true },
    }),
    prisma.guideSectionAck.findMany({ select: { userId: true, sectionId: true, readAt: true } }),
  ]);

  const sectionIds = new Set(sections.map((s) => s.id));
  const ackMap = new Map<string, Map<string, Date>>(); // userId -> sectionId -> readAt
  for (const a of acks) {
    if (!sectionIds.has(a.sectionId)) continue;
    if (!ackMap.has(a.userId)) ackMap.set(a.userId, new Map());
    ackMap.get(a.userId)!.set(a.sectionId, a.readAt);
  }

  const safetySections = sections.filter((s) => s.isSafetyCritical);

  return {
    sections,
    users: users.map((u) => {
      const mine = ackMap.get(u.id) ?? new Map<string, Date>();
      const readSafety = safetySections.filter((s) => mine.has(s.id));
      return {
        id: u.id,
        name: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.emailAddress,
        email: u.emailAddress,
        readSectionIds: [...mine.keys()],
        readCount: mine.size,
        totalCount: sections.length,
        safetyReadCount: readSafety.length,
        safetyTotalCount: safetySections.length,
        missingSafetySectionIds: safetySections.filter((s) => !mine.has(s.id)).map((s) => s.id),
        lastReadAt: mine.size ? new Date(Math.max(...[...mine.values()].map((d) => d.getTime()))) : null,
      };
    }),
  };
}

// ─── Image upload ─────────────────────────────────────────────────────────────

export async function uploadGuideImage(file: Express.Multer.File) {
  return uploadMediaFile(file, 'guides');
}
