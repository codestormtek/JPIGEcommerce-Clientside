import prisma from '../../lib/prisma';
import { ListMediaInput, CreateMediaInput, UpdateMediaInput, MediaFolder, CreateFolderInput, UpdateFolderInput, MEDIA_FOLDERS } from './media.schema';
import { getFolderPrefix } from '../../lib/storage';

// ─── BigInt serialization ─────────────────────────────────────────────────────
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

/** URL prefixes for system (hard-coded) folders */
const SYSTEM_PREFIXES: Record<MediaFolder, string> = {
  products:   getFolderPrefix('products'),
  avatars:    getFolderPrefix('avatars'),
  carousel:   getFolderPrefix('carousel'),
  blog:       getFolderPrefix('blog'),
  news:       getFolderPrefix('news'),
  topics:     getFolderPrefix('topics'),
  pages:      getFolderPrefix('pages'),
  categories: getFolderPrefix('categories'),
  galleries:  getFolderPrefix('galleries'),
  media:      getFolderPrefix('media'),
  widgets:    getFolderPrefix('widgets'),
};

const mediaInclude = { metadata: true } as const;

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function findMedia(input: ListMediaInput) {
  const { page, limit, mediaType, folder, orderBy, order } = input;
  const skip = (page - 1) * limit;
  const where: Record<string, unknown> = { isDeleted: false };
  if (mediaType) where['mediaType'] = mediaType;
  if (folder) {
    const isSystem = (MEDIA_FOLDERS as readonly string[]).includes(folder);
    if (isSystem) {
      const prefix = SYSTEM_PREFIXES[folder as MediaFolder];
      // Support both old assets (identified by URL) and new ones (explicit folder field)
      where['OR'] = [
        { folder },
        { folder: null, url: { startsWith: prefix } },
      ];
    } else {
      where['folder'] = folder;
    }
  }

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

// ─── Folder CRUD ──────────────────────────────────────────────────────────────

export async function listFolders() {
  return prisma.mediaFolder.findMany({ orderBy: [{ parentSlug: 'asc' }, { name: 'asc' }] });
}

export async function findFolderBySlug(slug: string) {
  return prisma.mediaFolder.findUnique({ where: { slug } });
}

export async function createFolder(input: CreateFolderInput) {
  return prisma.mediaFolder.create({ data: { ...input, isSystem: false } });
}

export async function updateFolder(slug: string, input: UpdateFolderInput) {
  return prisma.mediaFolder.update({ where: { slug }, data: input });
}

export async function deleteFolder(slug: string) {
  return prisma.mediaFolder.delete({ where: { slug } });
}

/** Seed system folders once on startup. */
export async function seedSystemFolders() {
  const systemFolders = [
    { name: 'Products',    slug: 'products',   parentSlug: null },
    { name: 'Categories',  slug: 'categories', parentSlug: null },
    { name: 'Avatars',     slug: 'avatars',    parentSlug: null },
    { name: 'Carousel',    slug: 'carousel',   parentSlug: null },
    { name: 'Blog',        slug: 'blog',       parentSlug: null },
    { name: 'News',        slug: 'news',       parentSlug: null },
    { name: 'Topics',      slug: 'topics',     parentSlug: null },
    { name: 'Pages',       slug: 'pages',      parentSlug: null },
    { name: 'Galleries',   slug: 'galleries',  parentSlug: null },
    { name: 'Widgets',     slug: 'widgets',    parentSlug: null },
    { name: 'General',     slug: 'media',      parentSlug: null },
    { name: 'Documents',   slug: 'documents',  parentSlug: null },
  ];
  for (const folder of systemFolders) {
    await prisma.mediaFolder.upsert({
      where:  { slug: folder.slug },
      update: {},
      create: { ...folder, isSystem: true },
    });
  }
}

