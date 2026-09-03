import { ApiError } from '../../utils/apiError';
import { ListPagesInput, CreatePageInput, UpdatePageInput } from './pages.schema';
import * as repo from './pages.repository';

export async function listPages(input: ListPagesInput) {
  return repo.findPages(input);
}

export async function getPageById(id: string) {
  const page = await repo.findPageById(id);
  if (!page) throw ApiError.notFound('Page');
  return page;
}

export async function getPageBySlug(slug: string) {
  const page = await repo.findPageBySlug(slug);
  if (!page) throw ApiError.notFound('Page');
  return page;
}

export async function createPage(input: CreatePageInput) {
  return repo.createPage(input);
}

export async function updatePage(id: string, input: UpdatePageInput) {
  await getPageById(id);
  return repo.updatePage(id, input);
}

export async function deletePage(id: string) {
  await getPageById(id);
  return repo.softDeletePage(id);
}
