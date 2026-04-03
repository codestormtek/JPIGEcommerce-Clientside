import { Router } from 'express';
import multer from 'multer';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import { config } from '../../config';
import {
  listProductsSchema,
  createProductSchema,
  updateProductSchema,
  createProductItemSchema,
  updateProductItemSchema,
  createProductAttributeSchema,
  createBrandSchema,
  updateBrandSchema,
  createCategorySchema,
  updateCategorySchema,
} from './products.schema';
import * as ctrl from './products.controller';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.uploads.maxFileSizeMb * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  },
});

const uploadDoc = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB for documents
});

export const productsRouter = Router();

// ─── Brands (static prefix — must be before /:id) ────────────────────────────

productsRouter.get('/brands', asyncHandler(ctrl.listBrands));
productsRouter.get('/brands/:id', asyncHandler(ctrl.getBrandById));
productsRouter.post('/brands', authenticate, authorize('admin'), validate(createBrandSchema), asyncHandler(ctrl.createBrand));
productsRouter.patch('/brands/:id', authenticate, authorize('admin'), validate(updateBrandSchema), asyncHandler(ctrl.updateBrand));
productsRouter.delete('/brands/:id', authenticate, authorize('admin'), asyncHandler(ctrl.deleteBrand));

// ─── Categories (static prefix — must be before /:id) ────────────────────────

productsRouter.get('/categories', asyncHandler(ctrl.listCategories));
productsRouter.get('/categories/:id', asyncHandler(ctrl.getCategoryById));
productsRouter.post('/categories', authenticate, authorize('admin'), validate(createCategorySchema), asyncHandler(ctrl.createCategory));
productsRouter.patch('/categories/:id', authenticate, authorize('admin'), validate(updateCategorySchema), asyncHandler(ctrl.updateCategory));
productsRouter.delete('/categories/:id', authenticate, authorize('admin'), asyncHandler(ctrl.deleteCategory));
productsRouter.post('/categories/:id/image', authenticate, authorize('admin'), upload.single('file'), asyncHandler(ctrl.uploadCategoryImage));

// ─── Products (public) ────────────────────────────────────────────────────────

// GET    /api/v1/products
productsRouter.get('/', validate(listProductsSchema, 'query'), asyncHandler(ctrl.listProducts));

// GET    /api/v1/products/:id
productsRouter.get('/:id', asyncHandler(ctrl.getProductById));

// GET    /api/v1/products/:id/reviews  (public — approved only)
productsRouter.get('/:id/reviews', asyncHandler(ctrl.listProductReviews));

// GET    /api/v1/products/:id/items
productsRouter.get('/:id/items', asyncHandler(ctrl.getProductItems));

// ─── Products (admin) ─────────────────────────────────────────────────────────

// POST   /api/v1/products
productsRouter.post('/', authenticate, authorize('admin'), validate(createProductSchema), asyncHandler(ctrl.createProduct));

// PATCH  /api/v1/products/:id
productsRouter.patch('/:id', authenticate, authorize('admin'), validate(updateProductSchema), asyncHandler(ctrl.updateProduct));

// DELETE /api/v1/products/:id
productsRouter.delete('/:id', authenticate, authorize('admin'), asyncHandler(ctrl.deleteProduct));

// POST   /api/v1/products/:id/items
productsRouter.post('/:id/items', authenticate, authorize('admin'), validate(createProductItemSchema), asyncHandler(ctrl.addProductItem));

// PATCH  /api/v1/products/:id/items/:itemId
productsRouter.patch('/:id/items/:itemId', authenticate, authorize('admin'), validate(updateProductItemSchema), asyncHandler(ctrl.updateProductItem));

// DELETE /api/v1/products/:id/items/:itemId
productsRouter.delete('/:id/items/:itemId', authenticate, authorize('admin'), asyncHandler(ctrl.deleteProductItem));

// ─── ProductAttributes (admin) ────────────────────────────────────────────────

// POST   /api/v1/products/:id/attributes
productsRouter.post('/:id/attributes', authenticate, authorize('admin'), validate(createProductAttributeSchema), asyncHandler(ctrl.createAttribute));

// DELETE /api/v1/products/:id/attributes/:attrId
productsRouter.delete('/:id/attributes/:attrId', authenticate, authorize('admin'), asyncHandler(ctrl.deleteAttribute));

// ─── ProductMedia / Image upload (admin) ──────────────────────────────────────

// POST   /api/v1/products/:id/image
productsRouter.post('/:id/image', authenticate, authorize('admin'), upload.single('file'), asyncHandler(ctrl.uploadProductImage));

// DELETE /api/v1/products/:id/image/:mediaAssetId
productsRouter.delete('/:id/image/:mediaAssetId', authenticate, authorize('admin'), asyncHandler(ctrl.deleteProductImage));

// ─── ProductDocuments (admin) ─────────────────────────────────────────────────

// GET    /api/v1/products/:id/documents
productsRouter.get('/:id/documents', authenticate, authorize('admin'), asyncHandler(ctrl.listProductDocuments));

// POST   /api/v1/products/:id/documents/:docType
productsRouter.post('/:id/documents/:docType', authenticate, authorize('admin'), uploadDoc.single('file'), asyncHandler(ctrl.uploadProductDocument));

// DELETE /api/v1/products/:id/documents/:docType
productsRouter.delete('/:id/documents/:docType', authenticate, authorize('admin'), asyncHandler(ctrl.deleteProductDocument));

