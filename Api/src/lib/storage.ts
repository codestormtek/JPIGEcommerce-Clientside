/**
 * storage.ts — local-disk storage adapter.
 *
 * Swap this module out (or add a branch on storageProvider) to support S3.
 * All callers go through these helpers — they never touch the filesystem directly.
 */

import path from 'path';
import fs from 'fs';
import { config } from '../config';

/** Resolve a storage key to an absolute path on disk. */
export function resolveUploadPath(...parts: string[]): string {
  return path.resolve(config.uploads.dir, ...parts);
}

/** Create a directory (and all parents) if it doesn't exist. */
export function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

/** Persist a Buffer to disk at the given storage key. */
export function saveFile(storageKey: string, data: Buffer): void {
  const fullPath = resolveUploadPath(storageKey);
  ensureDir(path.dirname(fullPath));
  fs.writeFileSync(fullPath, data);
}

/** Open a readable stream for the given storage key. */
export function readFileStream(storageKey: string): fs.ReadStream {
  return fs.createReadStream(resolveUploadPath(storageKey));
}

/** Delete a stored file from disk (no-op if it doesn't exist). */
export function deleteStoredFile(storageKey: string): void {
  const fullPath = resolveUploadPath(storageKey);
  if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
}

/** Return true if a storage key exists on disk. */
export function storageKeyExists(storageKey: string): boolean {
  return fs.existsSync(resolveUploadPath(storageKey));
}

