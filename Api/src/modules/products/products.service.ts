import { ApiError } from '../../utils/apiError';
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
import * as repo from './products.repository';
import { AuditContext, AuditAction, logAudit } from '../../utils/auditLogger';
import { uploadMediaFile } from '../media/media.service';

// ─── Products ─────────────────────────────────────────────────────────────────

export async function listProducts(input: ListProductsInput) {
  return repo.findProducts(input);
}

export async function getProductById(id: string) {
  const product = await repo.findProductById(id);
  if (!product) throw ApiError.notFound('Product');
  return product;
}

export async function createProduct(input: CreateProductInput, ctx?: AuditContext) {
  const product = await repo.createProduct(input);
  logAudit({
    action: AuditAction.PRODUCT_CREATED,
    entityType: 'Product',
    entityId: product.id,
    afterJson: product,
    ctx,
  });
  return product;
}

export async function updateProduct(id: string, input: UpdateProductInput, ctx?: AuditContext) {
  const before = await getProductById(id); // also ensures existence
  const after = await repo.updateProduct(id, input);
  logAudit({
    action: AuditAction.PRODUCT_UPDATED,
    entityType: 'Product',
    entityId: id,
    beforeJson: before,
    afterJson: after,
    ctx,
  });
  return after;
}

export async function deleteProduct(id: string, ctx?: AuditContext): Promise<void> {
  await getProductById(id);
  await repo.softDeleteProduct(id);
  logAudit({ action: AuditAction.PRODUCT_DELETED, entityType: 'Product', entityId: id, ctx });
}

// ─── ProductItems (SKUs) ──────────────────────────────────────────────────────

export async function getProductItems(productId: string) {
  await getProductById(productId);
  return repo.findProductItems(productId);
}

export async function addProductItem(productId: string, input: CreateProductItemInput) {
  await getProductById(productId);
  return repo.createProductItem(productId, input);
}

export async function editProductItem(
  productId: string,
  itemId: string,
  input: UpdateProductItemInput,
) {
  await getProductById(productId);
  return repo.updateProductItem(itemId, input);
}

export async function removeProductItem(productId: string, itemId: string): Promise<void> {
  await getProductById(productId);
  await repo.deleteProductItem(itemId);
}

// ─── Brands ───────────────────────────────────────────────────────────────────

export async function listBrands() {
  return repo.findBrands();
}

export async function getBrandById(id: string) {
  const brand = await repo.findBrandById(id);
  if (!brand) throw ApiError.notFound('Brand');
  return brand;
}

export async function createBrand(input: CreateBrandInput) {
  return repo.createBrand(input);
}

export async function updateBrand(id: string, input: UpdateBrandInput) {
  await getBrandById(id);
  return repo.updateBrand(id, input);
}

export async function deleteBrand(id: string): Promise<void> {
  await getBrandById(id);
  await repo.softDeleteBrand(id);
}

// ─── Categories ───────────────────────────────────────────────────────────────

export async function listCategories() {
  return repo.findCategories();
}

export async function getCategoryById(id: string) {
  const category = await repo.findCategoryById(id);
  if (!category) throw ApiError.notFound('Category');
  return category;
}

export async function createCategory(input: CreateCategoryInput) {
  return repo.createCategory(input);
}

export async function updateCategory(id: string, input: UpdateCategoryInput) {
  await getCategoryById(id);
  return repo.updateCategory(id, input);
}

export async function deleteCategory(id: string): Promise<void> {
  await getCategoryById(id);
  await repo.deleteCategory(id);
}

export async function uploadCategoryImage(categoryId: string, file: Express.Multer.File) {
  await getCategoryById(categoryId);
  // Upload through the media gallery so the asset appears in the Categories folder.
  const asset = await uploadMediaFile(file, 'categories');
  await repo.updateCategoryImage(categoryId, asset.url);
  return asset;
}

// ─── ProductAttributes ────────────────────────────────────────────────────────

export async function addProductAttribute(productId: string, input: CreateProductAttributeInput) {
  await getProductById(productId);
  return repo.createProductAttribute(productId, input);
}

export async function removeProductAttribute(productId: string, attrId: string): Promise<void> {
  await getProductById(productId);
  await repo.deleteProductAttribute(attrId);
}

// ─── ProductMedia (image upload) ──────────────────────────────────────────────

export async function uploadProductImage(productId: string, file: Express.Multer.File) {
  await getProductById(productId);
  // Upload through the media gallery so the asset appears in the Products folder.
  const asset = await uploadMediaFile(file, 'products');
  await repo.linkProductMediaByAssetId(productId, asset.id);
  return asset;
}

export async function removeProductImage(productId: string, mediaAssetId: string): Promise<void> {
  await getProductById(productId);
  await repo.deleteProductMedia(productId, mediaAssetId);
}

