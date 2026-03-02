import { Request, Response } from 'express';
import { AuthRequest } from '../../types';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from '../../utils/apiResponse';
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
import { ctxFromRequest } from '../../utils/auditLogger';
import * as service from './products.service';

// ─── Products ─────────────────────────────────────────────────────────────────

export async function listProducts(req: Request, res: Response): Promise<void> {
  const result = await service.listProducts(req.query as unknown as ListProductsInput);
  sendPaginated(res, result);
}

export async function getProductById(req: Request, res: Response): Promise<void> {
  const product = await service.getProductById(req.params['id'] as string);
  sendSuccess(res, product);
}

export async function createProduct(req: AuthRequest, res: Response): Promise<void> {
  const product = await service.createProduct(
    req.body as CreateProductInput,
    ctxFromRequest(req, req.user?.sub),
  );
  sendCreated(res, product, 'Product created');
}

export async function updateProduct(req: AuthRequest, res: Response): Promise<void> {
  const product = await service.updateProduct(
    req.params['id'] as string,
    req.body as UpdateProductInput,
    ctxFromRequest(req, req.user?.sub),
  );
  sendSuccess(res, product);
}

export async function deleteProduct(req: AuthRequest, res: Response): Promise<void> {
  await service.deleteProduct(req.params['id'] as string, ctxFromRequest(req, req.user?.sub));
  sendNoContent(res);
}

// ─── ProductItems ─────────────────────────────────────────────────────────────

export async function getProductItems(req: Request, res: Response): Promise<void> {
  const items = await service.getProductItems(req.params['id'] as string);
  sendSuccess(res, items);
}

export async function addProductItem(req: Request, res: Response): Promise<void> {
  const item = await service.addProductItem(req.params['id'] as string, req.body as CreateProductItemInput);
  sendCreated(res, item, 'Product item created');
}

export async function updateProductItem(req: Request, res: Response): Promise<void> {
  const item = await service.editProductItem(
    req.params['id'] as string,
    req.params['itemId'] as string,
    req.body as UpdateProductItemInput,
  );
  sendSuccess(res, item);
}

export async function deleteProductItem(req: Request, res: Response): Promise<void> {
  await service.removeProductItem(req.params['id'] as string, req.params['itemId'] as string);
  sendNoContent(res);
}

// ─── ProductAttributes ────────────────────────────────────────────────────────

export async function createAttribute(req: AuthRequest, res: Response): Promise<void> {
  const attr = await service.addProductAttribute(
    req.params['id'] as string,
    req.body as CreateProductAttributeInput,
  );
  sendCreated(res, attr, 'Attribute created');
}

export async function deleteAttribute(req: AuthRequest, res: Response): Promise<void> {
  await service.removeProductAttribute(req.params['id'] as string, req.params['attrId'] as string);
  sendNoContent(res);
}

// ─── ProductMedia (image) ─────────────────────────────────────────────────────

export async function uploadProductImage(req: AuthRequest, res: Response): Promise<void> {
  if (!req.file) throw new Error('No file attached');
  const asset = await service.uploadProductImage(req.params['id'] as string, req.file);
  sendCreated(res, asset, 'Image uploaded');
}

export async function deleteProductImage(req: AuthRequest, res: Response): Promise<void> {
  await service.removeProductImage(req.params['id'] as string, req.params['mediaAssetId'] as string);
  sendNoContent(res);
}

// ─── Brands ───────────────────────────────────────────────────────────────────

export async function listBrands(_req: Request, res: Response): Promise<void> {
  const brands = await service.listBrands();
  sendSuccess(res, brands);
}

export async function getBrandById(req: Request, res: Response): Promise<void> {
  const brand = await service.getBrandById(req.params['id'] as string);
  sendSuccess(res, brand);
}

export async function createBrand(req: Request, res: Response): Promise<void> {
  const brand = await service.createBrand(req.body as CreateBrandInput);
  sendCreated(res, brand, 'Brand created');
}

export async function updateBrand(req: Request, res: Response): Promise<void> {
  const brand = await service.updateBrand(req.params['id'] as string, req.body as UpdateBrandInput);
  sendSuccess(res, brand);
}

export async function deleteBrand(req: Request, res: Response): Promise<void> {
  await service.deleteBrand(req.params['id'] as string);
  sendNoContent(res);
}

// ─── Categories ───────────────────────────────────────────────────────────────

export async function listCategories(_req: Request, res: Response): Promise<void> {
  const categories = await service.listCategories();
  sendSuccess(res, categories);
}

export async function getCategoryById(req: Request, res: Response): Promise<void> {
  const category = await service.getCategoryById(req.params['id'] as string);
  sendSuccess(res, category);
}

export async function createCategory(req: Request, res: Response): Promise<void> {
  const category = await service.createCategory(req.body as CreateCategoryInput);
  sendCreated(res, category, 'Category created');
}

export async function updateCategory(req: Request, res: Response): Promise<void> {
  const category = await service.updateCategory(req.params['id'] as string, req.body as UpdateCategoryInput);
  sendSuccess(res, category);
}

export async function uploadCategoryImage(req: AuthRequest, res: Response): Promise<void> {
  if (!req.file) throw new Error('No file attached');
  const asset = await service.uploadCategoryImage(req.params['id'] as string, req.file);
  sendCreated(res, asset, 'Category image uploaded');
}

export async function deleteCategory(req: Request, res: Response): Promise<void> {
  await service.deleteCategory(req.params['id'] as string);
  sendNoContent(res);
}

