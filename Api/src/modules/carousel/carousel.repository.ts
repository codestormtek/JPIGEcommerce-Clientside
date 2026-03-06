import prisma from '../../lib/prisma';
import { ListSlidesInput, CreateSlideInput, UpdateSlideInput } from './carousel.schema';

// ─── Include shape ────────────────────────────────────────────────────────────

const slideInclude = {
  mediaAsset:       { include: { metadata: true } },
  mobileMediaAsset: { include: { metadata: true } },
} as const;

// ─── BigInt serialization ─────────────────────────────────────────────────────

type MediaMeta = { metadata: { fileSizeBytes: bigint | null } | null };
type SlideWithMedia = {
  mediaAsset?: MediaMeta | null;
  mobileMediaAsset?: MediaMeta | null;
};

function serializeBigInt<T extends SlideWithMedia>(slide: T): T {
  const fix = (asset: MediaMeta | null | undefined) => {
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
  };
  return {
    ...slide,
    mediaAsset: fix(slide.mediaAsset),
    mobileMediaAsset: fix(slide.mobileMediaAsset),
  } as T;
}

function serializeSlides<T extends SlideWithMedia>(slides: T[]): T[] {
  return slides.map(serializeBigInt);
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function findSlides(input: ListSlidesInput) {
  const { page, limit, isVisible, orderBy, order } = input;
  const skip  = (page - 1) * limit;
  const where: Record<string, unknown> = { isDeleted: false };
  if (isVisible !== undefined) where['isVisible'] = isVisible;

  const [items, total] = await Promise.all([
    prisma.carouselSlide.findMany({
      where,
      include: slideInclude,
      orderBy: { [orderBy]: order },
      skip,
      take: limit,
    }),
    prisma.carouselSlide.count({ where }),
  ]);

  return { data: serializeSlides(items), total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function findSlideById(id: string) {
  const slide = await prisma.carouselSlide.findFirst({
    where: { id, isDeleted: false },
    include: slideInclude,
  });
  return slide ? serializeBigInt(slide) : null;
}

// ─── Public-facing: active visible slides ordered by displayOrder ─────────────

export async function findPublicSlides() {
  const slides = await prisma.carouselSlide.findMany({
    where: { isDeleted: false, isVisible: true },
    include: slideInclude,
    orderBy: { displayOrder: 'asc' },
  });
  return serializeSlides(slides);
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createSlide(input: CreateSlideInput) {
  const slide = await prisma.carouselSlide.create({
    data: input,
    include: slideInclude,
  });
  return serializeBigInt(slide);
}

export async function updateSlide(id: string, input: UpdateSlideInput) {
  const slide = await prisma.carouselSlide.update({
    where: { id },
    data:  { ...input, lastModifiedAt: new Date() },
    include: slideInclude,
  });
  return serializeBigInt(slide);
}

export async function softDeleteSlide(id: string) {
  return prisma.carouselSlide.update({
    where: { id },
    data:  { isDeleted: true, lastModifiedAt: new Date() },
  });
}
