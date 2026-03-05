import prisma from '../../lib/prisma';
import { ListSlidesInput, CreateSlideInput, UpdateSlideInput } from './carousel.schema';

// ─── Include shape ────────────────────────────────────────────────────────────

const slideInclude = {
  mediaAsset:       { include: { metadata: true } },
  mobileMediaAsset: { include: { metadata: true } },
} as const;

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

  return { data: items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function findSlideById(id: string) {
  return prisma.carouselSlide.findFirst({
    where: { id, isDeleted: false },
    include: slideInclude,
  });
}

// ─── Public-facing: active visible slides ordered by displayOrder ─────────────

export async function findPublicSlides() {
  return prisma.carouselSlide.findMany({
    where: { isDeleted: false, isVisible: true },
    include: slideInclude,
    orderBy: { displayOrder: 'asc' },
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createSlide(input: CreateSlideInput) {
  return prisma.carouselSlide.create({
    data: input,
    include: slideInclude,
  });
}

export async function updateSlide(id: string, input: UpdateSlideInput) {
  return prisma.carouselSlide.update({
    where: { id },
    data:  { ...input, lastModifiedAt: new Date() },
    include: slideInclude,
  });
}

export async function softDeleteSlide(id: string) {
  return prisma.carouselSlide.update({
    where: { id },
    data:  { isDeleted: true, lastModifiedAt: new Date() },
  });
}

