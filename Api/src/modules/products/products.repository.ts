import prisma from '../../lib/prisma';

type TxClient = Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;
import {
  ListProductsInput,
  CreateProductInput,
  UpdateProductInput,
  CreateProductItemInput,
  UpdateProductItemInput,
  CreateProductAttributeInput,
  CreateBrandInput,
  UpdateBrandInput,
  CreateCategoryInput,
  UpdateCategoryInput,
} from './products.schema';

// ─── Shared include for product detail ───────────────────────────────────────

const productInclude = {
  brand: true,
  categoryMaps: { include: { category: true } },
  media: { include: { mediaAsset: true }, orderBy: { sortOrder: 'asc' as const } },
  attributes: { include: { values: true } },
  promotionProducts: { include: { promotion: true } },
  items: { take: 1, orderBy: { sku: 'asc' as const } },
} as const;

// ─── Products ─────────────────────────────────────────────────────────────────

export async function findProducts(input: ListProductsInput) {
  const { page, limit, search, brandId, categoryId, minPrice, maxPrice, orderBy, order } = input;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { isDeleted: false };
  if (search) where['name'] = { contains: search, mode: 'insensitive' };
  if (brandId) where['brandId'] = brandId;
  if (minPrice !== undefined || maxPrice !== undefined) {
    where['price'] = {
      ...(minPrice !== undefined ? { gte: minPrice } : {}),
      ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
    };
  }
  if (categoryId) {
    where['categoryMaps'] = { some: { categoryId } };
  }

  const [data, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: productInclude,
      orderBy: { [orderBy]: order },
      skip,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function findProductById(id: string) {
  return prisma.product.findFirst({
    where: { id, isDeleted: false },
    include: { ...productInclude, items: { include: { options: { include: { variationOption: true } } } } },
  });
}

export async function createProduct(input: CreateProductInput) {
  const { categoryIds, ...data } = input;
  return prisma.product.create({
    data: {
      ...data,
      ...(categoryIds?.length
        ? { categoryMaps: { create: categoryIds.map((cid) => ({ categoryId: cid })) } }
        : {}),
    },
    include: productInclude,
  });
}

export async function updateProduct(id: string, input: UpdateProductInput) {
  const { categoryIds, ...data } = input;
  return prisma.$transaction(async (tx: TxClient) => {
    if (categoryIds !== undefined) {
      await tx.productCategoryMap.deleteMany({ where: { productId: id } });
      if (categoryIds.length) {
        await tx.productCategoryMap.createMany({
          data: categoryIds.map((cid) => ({ productId: id, categoryId: cid })),
        });
      }
    }
    return tx.product.update({
      where: { id },
      data: { ...data, lastModifiedAt: new Date() },
      include: productInclude,
    });
  });
}

export async function softDeleteProduct(id: string): Promise<void> {
  await prisma.product.update({
    where: { id },
    data: { isDeleted: true, lastModifiedAt: new Date() },
  });
}

// ─── ProductItems (SKUs) ──────────────────────────────────────────────────────

export async function findProductItems(productId: string) {
  return prisma.productItem.findMany({
    where: { productId },
    include: { options: { include: { variationOption: { include: { variation: true } } } } },
  });
}

export async function createProductItem(productId: string, input: CreateProductItemInput) {
  return prisma.productItem.create({
    data: { ...input, productId },
    include: { options: { include: { variationOption: true } } },
  });
}

export async function updateProductItem(itemId: string, input: UpdateProductItemInput) {
  return prisma.productItem.update({
    where: { id: itemId },
    data: input,
    include: { options: { include: { variationOption: true } } },
  });
}

export async function deleteProductItem(itemId: string): Promise<void> {
  await prisma.productItem.delete({ where: { id: itemId } });
}

// ─── Brands ───────────────────────────────────────────────────────────────────

export async function findBrands() {
  return prisma.brand.findMany({
    where: { isDeleted: false },
    orderBy: { name: 'asc' },
    include: { _count: { select: { products: true } } },
  });
}

export async function findBrandById(id: string) {
  return prisma.brand.findFirst({ where: { id, isDeleted: false } });
}

export async function createBrand(input: CreateBrandInput) {
  return prisma.brand.create({ data: input });
}

export async function updateBrand(id: string, input: UpdateBrandInput) {
  return prisma.brand.update({ where: { id }, data: { ...input, lastModifiedAt: new Date() } });
}

export async function softDeleteBrand(id: string): Promise<void> {
  await prisma.brand.update({ where: { id }, data: { isDeleted: true, lastModifiedAt: new Date() } });
}

// ─── Categories ───────────────────────────────────────────────────────────────

export async function findCategories() {
  return prisma.productCategory.findMany({
    orderBy: { name: 'asc' },
    include: {
      parentCategory: { select: { id: true, name: true } },
      _count: { select: { children: true, productMaps: true } },
    },
  });
}

export async function findCategoryById(id: string) {
  return prisma.productCategory.findUnique({ where: { id }, include: { children: true } });
}

export async function createCategory(input: CreateCategoryInput) {
  return prisma.productCategory.create({ data: input });
}

export async function updateCategory(id: string, input: UpdateCategoryInput) {
  return prisma.productCategory.update({ where: { id }, data: input });
}

export async function updateCategoryImage(id: string, imageUrl: string) {
  return prisma.productCategory.update({ where: { id }, data: { imageUrl } });
}

export async function deleteCategory(id: string): Promise<void> {
  await prisma.productCategory.delete({ where: { id } });
}

// ─── ProductAttributes ────────────────────────────────────────────────────────

export async function createProductAttribute(productId: string, input: CreateProductAttributeInput) {
  return prisma.productAttribute.create({
    data: {
      productId,
      name: input.name,
      values: { create: input.values ?? [] },
    },
    include: { values: true },
  });
}

export async function deleteProductAttribute(attrId: string): Promise<void> {
  await prisma.productAttributeValue.deleteMany({ where: { productAttributeId: attrId } });
  await prisma.productAttribute.delete({ where: { id: attrId } });
}

// ─── ProductMedia ─────────────────────────────────────────────────────────────

export async function linkProductMedia(productId: string, url: string, altText?: string) {
  const existingCount = await prisma.productMedia.count({ where: { productId } });
  const isPrimary = existingCount === 0;
  const asset = await prisma.mediaAsset.create({
    data: { url, altText: altText ?? null, mediaType: 'image' },
  });
  await prisma.productMedia.create({
    data: { productId, mediaAssetId: asset.id, isPrimary, sortOrder: existingCount },
  });
  return asset;
}

/** Link an already-existing MediaAsset (e.g. created via the media gallery) to a product. */
export async function linkProductMediaByAssetId(productId: string, mediaAssetId: string) {
  const existingCount = await prisma.productMedia.count({ where: { productId } });
  const isPrimary = existingCount === 0;
  await prisma.productMedia.create({
    data: { productId, mediaAssetId, isPrimary, sortOrder: existingCount },
  });
}

export async function deleteProductMedia(productId: string, mediaAssetId: string): Promise<void> {
  await prisma.productMedia.delete({
    where: { productId_mediaAssetId: { productId, mediaAssetId } },
  });
  await prisma.mediaAsset.delete({ where: { id: mediaAssetId } });
}

