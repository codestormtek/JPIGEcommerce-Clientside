/**
 * storage.ts — storage adapter supporting local disk and Cloudflare R2 (S3-compatible).
 *
 * Switch between providers via STORAGE_PROVIDER env var ('local' | 'r2').
 * All callers go through these helpers — they never touch the filesystem directly.
 */

import path from 'path';
import fs from 'fs';
import { Readable } from 'stream';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { config } from '../config';

const provider = config.storage.provider;

// ─── R2 / S3 client ───────────────────────────────────────────────────────────

const s3 = provider === 'r2'
  ? new S3Client({
      region: 'auto',
      endpoint: config.storage.r2.endpoint,
      credentials: {
        accessKeyId: config.storage.r2.accessKeyId,
        secretAccessKey: config.storage.r2.secretAccessKey,
      },
    })
  : null;

const R2_BUCKET = config.storage.r2.bucket;

// ─── Local helpers (used only when provider === 'local') ──────────────────────

export function resolveUploadPath(...parts: string[]): string {
  return path.resolve(config.uploads.dir, ...parts);
}

export function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

// ─── Public URL ───────────────────────────────────────────────────────────────

/** Returns the public-facing URL for a given storage key. */
export function getPublicUrl(storageKey: string): string {
  if (provider === 'r2') {
    return `${config.storage.r2.publicBaseUrl}/${storageKey}`;
  }
  return `/uploads/${storageKey}`;
}

/** Returns the URL prefix used to filter a media folder in the database. */
export function getFolderPrefix(folder: string): string {
  if (provider === 'r2') {
    return `${config.storage.r2.publicBaseUrl}/${folder}/`;
  }
  return `/uploads/${folder}/`;
}

// ─── Core storage operations ──────────────────────────────────────────────────

/** Persist a Buffer at the given storage key. */
export async function saveFile(storageKey: string, data: Buffer): Promise<void> {
  if (provider === 'r2') {
    await s3!.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: storageKey,
      Body: data,
    }));
  } else {
    const fullPath = resolveUploadPath(storageKey);
    ensureDir(path.dirname(fullPath));
    fs.writeFileSync(fullPath, data);
  }
}

/** Open a readable stream for the given storage key. */
export async function readFileStream(storageKey: string): Promise<Readable> {
  if (provider === 'r2') {
    const response = await s3!.send(new GetObjectCommand({
      Bucket: R2_BUCKET,
      Key: storageKey,
    }));
    return response.Body as unknown as Readable;
  }
  return fs.createReadStream(resolveUploadPath(storageKey));
}

/** Delete a stored file (no-op if it doesn't exist). */
export async function deleteStoredFile(storageKey: string): Promise<void> {
  if (provider === 'r2') {
    await s3!.send(new DeleteObjectCommand({
      Bucket: R2_BUCKET,
      Key: storageKey,
    }));
  } else {
    const fullPath = resolveUploadPath(storageKey);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  }
}

/** Return true if a storage key exists. */
export async function storageKeyExists(storageKey: string): Promise<boolean> {
  if (provider === 'r2') {
    try {
      await s3!.send(new HeadObjectCommand({
        Bucket: R2_BUCKET,
        Key: storageKey,
      }));
      return true;
    } catch {
      return false;
    }
  }
  return fs.existsSync(resolveUploadPath(storageKey));
}

