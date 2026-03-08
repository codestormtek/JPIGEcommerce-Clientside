import { ApiError } from '../../utils/apiError';
import {
  ListPostsInput, CreatePostInput, UpdatePostInput,
  CreateCategoryInput, UpdateCategoryInput,
  CreateTagInput, UpdateTagInput,
  ListCommentsInput, CreateCommentInput,
} from './content.schema';
import * as repo from './content.repository';

// ─── Posts ────────────────────────────────────────────────────────────────────

export async function listPosts(input: ListPostsInput) {
  return repo.findPosts(input);
}

export async function getPostBySlug(slug: string) {
  const post = await repo.findPostBySlug(slug);
  if (!post) throw ApiError.notFound('Post');
  return post;
}

export async function getPostById(id: string) {
  const post = await repo.findPostById(id);
  if (!post) throw ApiError.notFound('Post');
  return post;
}

export async function createPost(authorUserId: string, input: CreatePostInput) {
  return repo.createPost(authorUserId, input);
}

export async function updatePost(id: string, input: UpdatePostInput) {
  await getPostById(id);
  return repo.updatePost(id, input);
}

export async function deletePost(id: string) {
  await getPostById(id);
  return repo.softDeletePost(id);
}

// ─── Categories ────────────────────────────────────────────────────────────────

export async function listCategories() {
  return repo.findCategories();
}

export async function createCategory(input: CreateCategoryInput) {
  return repo.createCategory(input);
}

export async function updateCategory(id: string, input: UpdateCategoryInput) {
  const cat = await repo.findCategoryById(id);
  if (!cat) throw ApiError.notFound('Content category');
  return repo.updateCategory(id, input);
}

export async function deleteCategory(id: string) {
  const cat = await repo.findCategoryById(id);
  if (!cat) throw ApiError.notFound('Content category');
  return repo.deleteCategory(id);
}

// ─── Tags ──────────────────────────────────────────────────────────────────────

export async function listTags() {
  return repo.findTags();
}

export async function createTag(input: CreateTagInput) {
  return repo.createTag(input);
}

export async function updateTag(id: string, input: UpdateTagInput) {
  const tag = await repo.findTagById(id);
  if (!tag) throw ApiError.notFound('Content tag');
  return repo.updateTag(id, input);
}

export async function deleteTag(id: string) {
  const tag = await repo.findTagById(id);
  if (!tag) throw ApiError.notFound('Content tag');
  return repo.deleteTag(id);
}

// ─── Comments ─────────────────────────────────────────────────────────────────

export async function listComments(postId: string, input: ListCommentsInput) {
  const post = await repo.findPostById(postId);
  if (!post) throw ApiError.notFound('Post');
  return repo.findCommentsByPostId(postId, input);
}

export async function getCommentCount(postId: string) {
  return repo.countCommentsByPostId(postId);
}

export async function createComment(postId: string, userId: string, input: CreateCommentInput) {
  const post = await repo.findPostById(postId);
  if (!post) throw ApiError.notFound('Post');
  if (input.parentId) {
    const parent = await repo.findCommentById(input.parentId);
    if (!parent || parent.postId !== postId) throw ApiError.badRequest('Invalid parent comment');
  }
  return repo.createComment(postId, userId, input);
}

export async function deleteComment(postId: string, commentId: string, userId: string, role: string) {
  const comment = await repo.findCommentById(commentId);
  if (!comment) throw ApiError.notFound('Comment');
  if (comment.postId !== postId) throw ApiError.notFound('Comment');
  if (comment.userId !== userId && role !== 'admin') {
    throw ApiError.forbidden('You can only delete your own comments');
  }
  return repo.deleteComment(commentId);
}

