/**
 * migrateUploadsToR2.ts
 *
 * One-time migration: finds every media_asset whose URL starts with /uploads/,
 * uploads the file to R2, then updates:
 *   - media_assets.url          → CDN URL
 *   - product_categories.imageUrl → CDN URL (where it matches the old path)
 *
 * Run from Api/ with:
 *   npx ts-node -P tsconfig.seed.json prisma/migrateUploadsToR2.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// ─── Config ───────────────────────────────────────────────────────────────────

const R2_ENDPOINT     = process.env.R2_ENDPOINT
  ?? `https://${process.env.R2_ACCOUNT_ID ?? ''}.r2.cloudflarestorage.com`;
const R2_ACCESS_KEY   = process.env.R2_ACCESS_KEY_ID     ?? '';
const R2_SECRET_KEY   = process.env.R2_SECRET_ACCESS_KEY ?? '';
const R2_BUCKET       = process.env.R2_BUCKET            ?? '';
const CDN_BASE        = (process.env.R2_PUBLIC_BASE_URL  ?? '').replace(/\/$/, '');
const UPLOADS_DIR     = path.resolve(__dirname, '../uploads');

const s3 = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: { accessKeyId: R2_ACCESS_KEY, secretAccessKey: R2_SECRET_KEY },
});

const prisma = new PrismaClient();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mimeFromExt(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const map: Record<string, string> = {
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.gif': 'image/gif', '.webp': 'image/webp',
  };
  return map[ext] ?? 'application/octet-stream';
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // 1. Find all local-storage media assets
  const assets = await prisma.mediaAsset.findMany({
    where: { url: { startsWith: '/uploads/' }, isDeleted: false },
  });

  console.log(`Found ${assets.length} local media asset(s) to migrate.\n`);

  let migrated = 0;
  let skipped  = 0;
  let failed   = 0;

  for (const asset of assets) {
    // Derive storage key: '/uploads/products/2026/03/abc.png' → 'products/2026/03/abc.png'
    const storageKey = asset.url.replace(/^\/uploads\//, '');
    const localPath  = path.join(UPLOADS_DIR, storageKey);
    const cdnUrl     = `${CDN_BASE}/${storageKey}`;

    if (!fs.existsSync(localPath)) {
      console.warn(`  ⚠  SKIP  ${asset.url}  (file not found on disk)`);
      skipped++;
      continue;
    }

    try {
      const fileBuffer = fs.readFileSync(localPath);
      const mimeType   = mimeFromExt(localPath);

      // 2. Upload to R2
      await s3.send(new PutObjectCommand({
        Bucket:      R2_BUCKET,
        Key:         storageKey,
        Body:        fileBuffer,
        ContentType: mimeType,
      }));

      // 3. Update media_assets.url
      await prisma.mediaAsset.update({
        where: { id: asset.id },
        data:  { url: cdnUrl },
      });

      // 4. Update product_categories.imageUrl if it references the old path
      const catResult = await prisma.productCategory.updateMany({
        where: { imageUrl: asset.url },
        data:  { imageUrl: cdnUrl },
      });

      const catNote = catResult.count > 0 ? ` (updated ${catResult.count} category row)` : '';
      console.log(`  ✓  ${storageKey}${catNote}`);
      migrated++;
    } catch (err) {
      console.error(`  ✗  FAILED  ${asset.url}:`, (err as Error).message);
      failed++;
    }
  }

  console.log(`\n─────────────────────────────────────`);
  console.log(`  Migrated : ${migrated}`);
  console.log(`  Skipped  : ${skipped}`);
  console.log(`  Failed   : ${failed}`);
  console.log(`─────────────────────────────────────`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

