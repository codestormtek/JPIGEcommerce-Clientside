import path from 'path';
import { randomUUID } from 'crypto';
import { ApiError } from '../../utils/apiError';
import { saveFile, readFileStream, deleteStoredFile, storageKeyExists } from '../../lib/storage';
import { logAudit, AuditAction, AuditContext } from '../../utils/auditLogger';
import * as repo from './files.repository';
import type { ListFilesInput, CreateFileLinkInput } from './files.schema';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain', 'text/csv',
]);

export async function uploadFile(
  file: Express.Multer.File,
  uploadedByUserId: string | undefined,
  ctx?: AuditContext,
) {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    throw ApiError.badRequest(`File type "${file.mimetype}" is not allowed.`);
  }

  const ext = path.extname(file.originalname) || '';
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const storageKey = `files/${yyyy}/${mm}/${dd}/${randomUUID()}${ext}`;

  saveFile(storageKey, file.buffer);

  const stored = await repo.createStoredFile({
    originalName: file.originalname,
    mimeType: file.mimetype,
    sizeBytes: BigInt(file.size),
    storageKey,
    uploadedByUserId,
  });

  logAudit({ action: AuditAction.FILE_UPLOADED, entityType: 'StoredFile', entityId: stored.id, ctx });
  return stored;
}

export async function listFiles(input: ListFilesInput) {
  return repo.findStoredFiles(input);
}

export async function getFileById(id: string) {
  const file = await repo.findStoredFileById(id);
  if (!file) throw ApiError.notFound('File');
  return file;
}

export async function downloadFile(id: string) {
  const file = await getFileById(id);
  if (!storageKeyExists(file.storageKey)) {
    throw ApiError.notFound('File content');
  }
  return { file, stream: readFileStream(file.storageKey) };
}

export async function deleteFile(id: string, ctx?: AuditContext) {
  const file = await getFileById(id);
  deleteStoredFile(file.storageKey);
  await repo.softDeleteStoredFile(id);
  logAudit({ action: AuditAction.FILE_DELETED, entityType: 'StoredFile', entityId: id, ctx });
}

export async function linkFileToEntity(fileId: string, input: CreateFileLinkInput) {
  await getFileById(fileId);
  return repo.createFileLink(fileId, input);
}

export async function getFilesByEntity(entityType: string, entityId: string, tag?: string) {
  return repo.findFilesByEntity(entityType, entityId, tag);
}

export async function deleteLink(linkId: string) {
  return repo.deleteFileLink(linkId);
}

