import prisma from '../../lib/prisma';
import { ListPostsInput, CreatePostInput, UpdatePostInput, CreateCategoryInput, UpdateCategoryInput, CreateTagInput, UpdateTagInput, ListCommentsInput, CreateCommentInput } from './content.schema';

type TxClient = Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

const postInclude = {
  categories: { include: { category: true } },
  tags: { include: { tag: true } },
  media: { include: { mediaAsset: true }, orderBy: { sortOrder: 'asc' as const } },
  featuredMediaAsset: true,
  authorUser: { select: { id: true, firstName: true, lastName: true, emailAddress: true } },
} as const;

// ─── Posts ────────────────────────────────────────────────────────────────────

export async function findPosts(input: ListPostsInput) {
  const { page, limit, postType, status, categoryId, tagId, search, orderBy, order } = input;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { isDeleted: false };
  if (postType) where['postType'] = postType;
  if (status) where['status'] = status;
  if (categoryId) where['categories'] = { some: { categoryId } };
  if (tagId) where['tags'] = { some: { tagId } };
  if (search) where['OR'] = [{ title: { contains: search, mode: 'insensitive' } }, { excerpt: { contains: search, mode: 'insensitive' } }];

  const [data, total] = await Promise.all([
    prisma.contentPost.findMany({ where, include: postInclude, orderBy: { [orderBy]: order }, skip, take: limit }),
    prisma.contentPost.count({ where }),
  ]);
  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function findPostBySlug(slug: string) {
  return prisma.contentPost.findFirst({ where: { slug, isDeleted: false }, include: postInclude });
}

export async function findPostById(id: string) {
  return prisma.contentPost.findFirst({ where: { id, isDeleted: false }, include: postInclude });
}

async function syncPostRelations(tx: TxClient, postId: string, categoryIds?: string[], tagIds?: string[], mediaAssetIds?: string[]) {
  if (categoryIds !== undefined) {
    await tx.contentPostCategory.deleteMany({ where: { postId } });
    if (categoryIds.length) await tx.contentPostCategory.createMany({ data: categoryIds.map((categoryId) => ({ postId, categoryId })) });
  }
  if (tagIds !== undefined) {
    await tx.contentPostTag.deleteMany({ where: { postId } });
    if (tagIds.length) await tx.contentPostTag.createMany({ data: tagIds.map((tagId) => ({ postId, tagId })) });
  }
  if (mediaAssetIds !== undefined) {
    await tx.contentPostMedia.deleteMany({ where: { postId } });
    if (mediaAssetIds.length) {
      await tx.contentPostMedia.createMany({ data: mediaAssetIds.map((mediaAssetId, sortOrder) => ({ postId, mediaAssetId, sortOrder })) });
    }
  }
}

export async function createPost(authorUserId: string, input: CreatePostInput) {
  const { categoryIds, tagIds, mediaAssetIds, ...data } = input;
  return prisma.$transaction(async (tx: TxClient) => {
    const post = await tx.contentPost.create({ data: { ...data, authorUserId }, include: postInclude });
    await syncPostRelations(tx, post.id, categoryIds, tagIds, mediaAssetIds);
    return tx.contentPost.findUnique({ where: { id: post.id }, include: postInclude });
  });
}

export async function updatePost(id: string, input: UpdatePostInput) {
  const { categoryIds, tagIds, mediaAssetIds, ...data } = input;
  return prisma.$transaction(async (tx: TxClient) => {
    await syncPostRelations(tx, id, categoryIds, tagIds, mediaAssetIds);
    return tx.contentPost.update({ where: { id }, data, include: postInclude });
  });
}

export async function softDeletePost(id: string) {
  return prisma.contentPost.update({ where: { id }, data: { isDeleted: true } });
}

// ─── Categories ────────────────────────────────────────────────────────────────

export async function findCategories() {
  return prisma.contentCategory.findMany({ orderBy: { name: 'asc' } });
}

export async function findCategoryById(id: string) {
  return prisma.contentCategory.findUnique({ where: { id } });
}

export async function createCategory(input: CreateCategoryInput) {
  return prisma.contentCategory.create({ data: input });
}

export async function updateCategory(id: string, input: UpdateCategoryInput) {
  return prisma.contentCategory.update({ where: { id }, data: input });
}

export async function deleteCategory(id: string) {
  return prisma.contentCategory.delete({ where: { id } });
}

// ─── Tags ──────────────────────────────────────────────────────────────────────

export async function findTags() {
  return prisma.contentTag.findMany({ orderBy: { name: 'asc' } });
}

export async function findTagById(id: string) {
  return prisma.contentTag.findUnique({ where: { id } });
}

export async function createTag(input: CreateTagInput) {
  return prisma.contentTag.create({ data: input });
}

export async function updateTag(id: string, input: UpdateTagInput) {
  return prisma.contentTag.update({ where: { id }, data: input });
}

export async function deleteTag(id: string) {
  return prisma.contentTag.delete({ where: { id } });
}

// ─── Comments ─────────────────────────────────────────────────────────────────

const commentInclude = {
  user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
  replies: {
    where: { isApproved: true },
    include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
    orderBy: { createdAt: 'asc' as const },
  },
} as const;

export async function findCommentsByPostId(postId: string, input: ListCommentsInput) {
  const { page, limit } = input;
  const skip = (page - 1) * limit;
  const where = { postId, isApproved: true, parentId: null };

  const [data, total] = await Promise.all([
    prisma.contentComment.findMany({ where, include: commentInclude, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.contentComment.count({ where }),
  ]);
  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function countCommentsByPostId(postId: string) {
  return prisma.contentComment.count({ where: { postId, isApproved: true } });
}

export async function createComment(postId: string, userId: string, input: CreateCommentInput) {
  return prisma.contentComment.create({
    data: { postId, userId, body: input.body, parentId: input.parentId || null, isApproved: true },
    include: commentInclude,
  });
}

export async function findCommentById(id: string) {
  return prisma.contentComment.findUnique({ where: { id }, include: commentInclude });
}

export async function deleteComment(id: string) {
  await prisma.contentComment.deleteMany({ where: { parentId: id } });
  return prisma.contentComment.delete({ where: { id } });
}

