import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  listPostsSchema,
  createPostSchema,
  updatePostSchema,
  createCategorySchema,
  updateCategorySchema,
  createTagSchema,
  updateTagSchema,
} from './content.schema';
import * as ctrl from './content.controller';

export const contentRouter = Router();

// ─── Static prefixes (must be before /:slug and /:id) ────────────────────────

// GET    /api/v1/content/categories
contentRouter.get('/categories', asyncHandler(ctrl.listCategories));
// POST   /api/v1/content/categories
contentRouter.post('/categories', authenticate, authorize('admin'), validate(createCategorySchema), asyncHandler(ctrl.createCategory));
// PATCH  /api/v1/content/categories/:id
contentRouter.patch('/categories/:id', authenticate, authorize('admin'), validate(updateCategorySchema), asyncHandler(ctrl.updateCategory));
// DELETE /api/v1/content/categories/:id
contentRouter.delete('/categories/:id', authenticate, authorize('admin'), asyncHandler(ctrl.deleteCategory));

// GET    /api/v1/content/tags
contentRouter.get('/tags', asyncHandler(ctrl.listTags));
// POST   /api/v1/content/tags
contentRouter.post('/tags', authenticate, authorize('admin'), validate(createTagSchema), asyncHandler(ctrl.createTag));
// PATCH  /api/v1/content/tags/:id
contentRouter.patch('/tags/:id', authenticate, authorize('admin'), validate(updateTagSchema), asyncHandler(ctrl.updateTag));
// DELETE /api/v1/content/tags/:id
contentRouter.delete('/tags/:id', authenticate, authorize('admin'), asyncHandler(ctrl.deleteTag));

// ─── Posts ────────────────────────────────────────────────────────────────────

// GET    /api/v1/content           — list posts (public)
contentRouter.get('/', validate(listPostsSchema, 'query'), asyncHandler(ctrl.listPosts));

// POST   /api/v1/content           — create post (admin, author set from JWT)
contentRouter.post('/', authenticate, authorize('admin'), validate(createPostSchema), asyncHandler(ctrl.createPost));

// GET    /api/v1/content/:slug     — get by slug (public)
contentRouter.get('/:slug', asyncHandler(ctrl.getPostBySlug));

// PATCH  /api/v1/content/:id       — update post (admin)
contentRouter.patch('/:id', authenticate, authorize('admin'), validate(updatePostSchema), asyncHandler(ctrl.updatePost));

// DELETE /api/v1/content/:id       — soft-delete post (admin)
contentRouter.delete('/:id', authenticate, authorize('admin'), asyncHandler(ctrl.deletePost));

