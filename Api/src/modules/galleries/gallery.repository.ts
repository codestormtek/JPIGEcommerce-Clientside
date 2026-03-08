import prisma from '../../lib/prisma';
import type {
  ListGalleriesInput,
  CreateGalleryInput,
  UpdateGalleryInput,
  AddGalleryImageInput,
  UpdateGalleryImageInput,
} from './gallery.schema';

const imageInclude = {
  mediaAsset: { include: { metadata: true } },
} as const;

const galleryInclude = {
  images: {
    include: imageInclude,
    orderBy: { sortOrder: 'asc' as const },
  },
} as const;

type MediaMeta = { metadata: { fileSizeBytes: bigint | null } | null };
type ImageWithMedia = { mediaAsset?: MediaMeta | null };
type GalleryWithImages = { images?: ImageWithMedia[] };

function fixBigInt(asset: MediaMeta | null | undefined) {
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

function serializeGallery<T extends GalleryWithImages>(gallery: T): T {
  if (!gallery.images) return gallery;
  return {
    ...gallery,
    images: gallery.images.map((img) => ({
      ...img,
      mediaAsset: fixBigInt(img.mediaAsset),
    })),
  } as T;
}

function serializeMany<T extends GalleryWithImages>(galleries: T[]): T[] {
  return galleries.map(serializeGallery);
}

export async function findGalleries(input: ListGalleriesInput) {
  const { page, limit, isVisible, orderBy, order } = input;
  const skip = (page - 1) * limit;
  const where: Record<string, unknown> = { isDeleted: false };
  if (isVisible !== undefined) where['isVisible'] = isVisible;

  const [items, total] = await Promise.all([
    prisma.gallery.findMany({
      where,
      include: galleryInclude,
      orderBy: { [orderBy]: order },
      skip,
      take: limit,
    }),
    prisma.gallery.count({ where }),
  ]);

  return {
    data: serializeMany(items),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function findGalleryById(id: string) {
  const gallery = await prisma.gallery.findFirst({
    where: { id, isDeleted: false },
    include: galleryInclude,
  });
  return gallery ? serializeGallery(gallery) : null;
}

export async function findGalleryBySlug(slug: string) {
  const gallery = await prisma.gallery.findFirst({
    where: { slug, isDeleted: false, isVisible: true },
    include: galleryInclude,
  });
  return gallery ? serializeGallery(gallery) : null;
}

export async function findPublicGalleries() {
  const galleries = await prisma.gallery.findMany({
    where: { isDeleted: false, isVisible: true },
    include: galleryInclude,
    orderBy: { displayOrder: 'asc' },
  });
  return serializeMany(galleries);
}

export async function createGallery(input: CreateGalleryInput) {
  const gallery = await prisma.gallery.create({
    data: input,
    include: galleryInclude,
  });
  return serializeGallery(gallery);
}

export async function updateGallery(id: string, input: UpdateGalleryInput) {
  const gallery = await prisma.gallery.update({
    where: { id },
    data: { ...input, lastModifiedAt: new Date() },
    include: galleryInclude,
  });
  return serializeGallery(gallery);
}

export async function softDeleteGallery(id: string) {
  return prisma.gallery.update({
    where: { id },
    data: { isDeleted: true, lastModifiedAt: new Date() },
  });
}

export async function addImage(galleryId: string, input: AddGalleryImageInput) {
  const image = await prisma.galleryImage.create({
    data: { galleryId, ...input },
    include: imageInclude,
  });
  return {
    ...image,
    mediaAsset: fixBigInt(image.mediaAsset),
  };
}

export async function findImageByIdAndGallery(imageId: string, galleryId: string) {
  return prisma.galleryImage.findFirst({
    where: { id: imageId, galleryId },
    include: imageInclude,
  });
}

export async function updateImage(imageId: string, input: UpdateGalleryImageInput) {
  const image = await prisma.galleryImage.update({
    where: { id: imageId },
    data: input,
    include: imageInclude,
  });
  return {
    ...image,
    mediaAsset: fixBigInt(image.mediaAsset),
  };
}

export async function removeImage(imageId: string) {
  return prisma.galleryImage.delete({ where: { id: imageId } });
}
