import { Request, Response } from 'express';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from '../../utils/apiResponse';
import { AuthRequest } from '../../types';
import {
  ListPostsInput, CreatePostInput, UpdatePostInput,
  CreateCategoryInput, UpdateCategoryInput,
  CreateTagInput, UpdateTagInput,
  ListCommentsInput, CreateCommentInput,
} from './content.schema';
import * as service from './content.service';

// ─── Posts ────────────────────────────────────────────────────────────────────

// GET /api/v1/content
export async function listPosts(req: Request, res: Response): Promise<void> {
  const result = await service.listPosts(req.query as unknown as ListPostsInput);
  sendPaginated(res, result);
}

// GET /api/v1/content/:slug
export async function getPostBySlug(req: Request, res: Response): Promise<void> {
  const post = await service.getPostBySlug(req.params['slug'] as string);
  sendSuccess(res, post);
}

// POST /api/v1/content
export async function createPost(req: AuthRequest, res: Response): Promise<void> {
  const post = await service.createPost(req.user!.sub, req.body as CreatePostInput);
  sendCreated(res, post, 'Post created');
}

// PATCH /api/v1/content/:id
export async function updatePost(req: Request, res: Response): Promise<void> {
  const post = await service.updatePost(req.params['id'] as string, req.body as UpdatePostInput);
  sendSuccess(res, post, 'Post updated');
}

// DELETE /api/v1/content/:id
export async function deletePost(req: Request, res: Response): Promise<void> {
  await service.deletePost(req.params['id'] as string);
  sendNoContent(res);
}

// ─── Categories ────────────────────────────────────────────────────────────────

export async function listCategories(req: Request, res: Response): Promise<void> {
  const data = await service.listCategories();
  sendSuccess(res, data);
}

export async function createCategory(req: Request, res: Response): Promise<void> {
  const cat = await service.createCategory(req.body as CreateCategoryInput);
  sendCreated(res, cat, 'Category created');
}

export async function updateCategory(req: Request, res: Response): Promise<void> {
  const cat = await service.updateCategory(req.params['id'] as string, req.body as UpdateCategoryInput);
  sendSuccess(res, cat, 'Category updated');
}

export async function deleteCategory(req: Request, res: Response): Promise<void> {
  await service.deleteCategory(req.params['id'] as string);
  sendNoContent(res);
}

// ─── Tags ──────────────────────────────────────────────────────────────────────

export async function listTags(req: Request, res: Response): Promise<void> {
  const data = await service.listTags();
  sendSuccess(res, data);
}

export async function createTag(req: Request, res: Response): Promise<void> {
  const tag = await service.createTag(req.body as CreateTagInput);
  sendCreated(res, tag, 'Tag created');
}

export async function updateTag(req: Request, res: Response): Promise<void> {
  const tag = await service.updateTag(req.params['id'] as string, req.body as UpdateTagInput);
  sendSuccess(res, tag, 'Tag updated');
}

export async function deleteTag(req: Request, res: Response): Promise<void> {
  await service.deleteTag(req.params['id'] as string);
  sendNoContent(res);
}

// ─── Comments ─────────────────────────────────────────────────────────────────

export async function listComments(req: Request, res: Response): Promise<void> {
  const postId = req.params['postId'] as string;
  const result = await service.listComments(postId, req.query as unknown as ListCommentsInput);
  sendPaginated(res, result);
}

export async function createComment(req: AuthRequest, res: Response): Promise<void> {
  const postId = req.params['postId'] as string;
  const comment = await service.createComment(postId, req.user!.sub, req.body as CreateCommentInput);
  sendCreated(res, comment, 'Comment posted');
}

export async function deleteComment(req: AuthRequest, res: Response): Promise<void> {
  const postId = req.params['postId'] as string;
  await service.deleteComment(postId, req.params['commentId'] as string, req.user!.sub, req.user!.role);
  sendNoContent(res);
}

