import prisma from '../../lib/prisma';
import { ListMediaInput, CreateMediaInput, UpdateMediaInput, MediaFolder } from './media.schema';

// ─── BigInt serialization ─────────────────────────────────────────────────────
// Prisma maps BIGINT columns to JS BigInt.  JSON.stringify cannot handle BigInt,
// so we convert fileSizeBytes to a plain number before leaving the repository.
// File sizes will never exceed Number.MAX_SAFE_INTEGER (~9 PB) so this is safe.

type WithMetadata = { metadata: { fileSizeBytes: bigint | null } | null };

function serializeAsset<T extends WithMetadata>(asset: T): T {
  if (!asset?.metadata) return asset;
  return {
    ...asset,
    metadata: {
      ...asset.metadata,
      fileSizeBytes:
        asset.metadata.fileSizeBytes != null
          ? Number(asset.metadata.fileSizeBytes)
          : null,
    },
  };
}

/** Maps every folder key to the URL prefix used when files are stored on disk. */
const FOLDER_PREFIXES: Record<MediaFolder, string> = {
  products:   '/uploads/products/',
  avatars:    '/uploads/avatars/',
  carousel:   '/uploads/carousel/',
  blog:       '/uploads/blog/',
  news:       '/uploads/news/',
  topics:     '/uploads/topics/',
  categories: '/uploads/categories/',
  media:      '/uploads/media/',
};

const mediaInclude = { metadata: true } as const;

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function findMedia(input: ListMediaInput) {
  const { page, limit, mediaType, folder, orderBy, order } = input;
  const skip = (page - 1) * limit;
  const where: Record<string, unknown> = { isDeleted: false };
  if (mediaType) where['mediaType'] = mediaType;
  if (folder)    where['url'] = { startsWith: FOLDER_PREFIXES[folder] };

  const [raw, total] = await Promise.all([
    prisma.mediaAsset.findMany({
      where,
      include: mediaInclude,
      orderBy: { [orderBy]: order },
      skip,
      take: limit,
    }),
    prisma.mediaAsset.count({ where }),
  ]);

  return { data: raw.map(serializeAsset), total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function findMediaById(id: string) {
  const asset = await prisma.mediaAsset.findFirst({
    where: { id, isDeleted: false },
    include: mediaInclude,
  });
  return asset ? serializeAsset(asset) : null;
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createMedia(input: CreateMediaInput) {
  const { metadata, ...data } = input;

  const asset = await prisma.mediaAsset.create({
    data: {
      ...data,
      ...(metadata
        ? {
            metadata: {
              create: {
                mimeType: metadata.mimeType,
                fileSizeBytes: metadata.fileSizeBytes !== undefined ? BigInt(metadata.fileSizeBytes) : undefined,
                widthPx: metadata.widthPx,
                heightPx: metadata.heightPx,
                checksumSha256: metadata.checksumSha256,
              },
            },
          }
        : {}),
    },
    include: mediaInclude,
  });
  return serializeAsset(asset);
}

export async function updateMedia(id: string, input: UpdateMediaInput) {
  const { metadata, ...data } = input;

  if (metadata) {
    await prisma.mediaAssetMetadata.upsert({
      where: { mediaAssetId: id },
      create: {
        mediaAssetId: id,
        mimeType: metadata.mimeType,
        fileSizeBytes: metadata.fileSizeBytes !== undefined ? BigInt(metadata.fileSizeBytes) : undefined,
        widthPx: metadata.widthPx,
        heightPx: metadata.heightPx,
        checksumSha256: metadata.checksumSha256,
      },
      update: {
        mimeType: metadata.mimeType,
        fileSizeBytes: metadata.fileSizeBytes !== undefined ? BigInt(metadata.fileSizeBytes) : undefined,
        widthPx: metadata.widthPx,
        heightPx: metadata.heightPx,
        checksumSha256: metadata.checksumSha256,
      },
    });
  }

  const asset = await prisma.mediaAsset.update({
    where: { id },
    data,
    include: mediaInclude,
  });
  return serializeAsset(asset);
}

export async function softDeleteMedia(id: string) {
  return prisma.mediaAsset.update({
    where: { id },
    data: { isDeleted: true },
  });
}

