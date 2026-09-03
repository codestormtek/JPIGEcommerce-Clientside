import prisma from '../../lib/prisma';
import type { ListFilesInput, CreateFileLinkInput } from './files.schema';

// ─── StoredFile ────────────────────────────────────────────────────────────────

export interface CreateStoredFileData {
  originalName: string;
  mimeType: string;
  sizeBytes: bigint;
  storageKey: string;
  storageProvider?: string;
  uploadedByUserId?: string;
}

export async function createStoredFile(data: CreateStoredFileData) {
  return prisma.storedFile.create({ data });
}

export async function findStoredFiles(input: ListFilesInput) {
  const { page, limit, mimeType, uploadedByUserId } = input;
  const where = {
    isDeleted: false,
    ...(mimeType ? { mimeType: { contains: mimeType } } : {}),
    ...(uploadedByUserId ? { uploadedByUserId } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.storedFile.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { uploadedBy: { select: { id: true, emailAddress: true } } },
    }),
    prisma.storedFile.count({ where }),
  ]);
  return { items, total, page, limit };
}

export async function findStoredFileById(id: string) {
  return prisma.storedFile.findFirst({ where: { id, isDeleted: false } });
}

export async function softDeleteStoredFile(id: string) {
  return prisma.storedFile.update({ where: { id }, data: { isDeleted: true } });
}

// ─── EntityFileLink ───────────────────────────────────────────────────────────

export async function createFileLink(fileId: string, input: CreateFileLinkInput) {
  return prisma.entityFileLink.create({
    data: { fileId, ...input },
    include: { file: true },
  });
}

export async function findFilesByEntity(entityType: string, entityId: string, tag?: string) {
  const links = await prisma.entityFileLink.findMany({
    where: { entityType, entityId, ...(tag ? { tag } : {}) },
    orderBy: { displayOrder: 'asc' },
    include: { file: true },
  });
  // Filter out soft-deleted files
  return links.filter((l) => !l.file.isDeleted);
}

export async function deleteFileLink(id: string) {
  return prisma.entityFileLink.delete({ where: { id } });
}

