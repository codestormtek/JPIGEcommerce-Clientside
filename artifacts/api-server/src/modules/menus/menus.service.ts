import { ApiError } from '../../utils/apiError';
import {
  ListMenusInput, CreateMenuInput, UpdateMenuInput,
  CreateSectionInput, UpdateSectionInput, AddSectionItemInput, UpdateSectionItemInput,
  ListMenuItemsInput, CreateMenuItemInput, UpdateMenuItemInput,
  PublishMenuInput, ReorderSectionItemsInput,
} from './menus.schema';
import * as repo from './menus.repository';

// ─── Menus ────────────────────────────────────────────────────────────────────

export async function listMenus(input: ListMenusInput) {
  return repo.findMenus(input);
}

export async function getMenuById(id: string) {
  const menu = await repo.findMenuById(id);
  if (!menu) throw ApiError.notFound('Menu');
  return menu;
}

export async function createMenu(input: CreateMenuInput) {
  return repo.createMenu(input);
}

export async function updateMenu(id: string, input: UpdateMenuInput) {
  await getMenuById(id);
  return repo.updateMenu(id, input);
}

export async function deleteMenu(id: string) {
  await getMenuById(id);
  return repo.softDeleteMenu(id);
}

export async function getMenuBuilder(id: string) {
  const menu = await repo.findMenuBuilder(id);
  if (!menu) throw ApiError.notFound('Menu');
  return menu;
}

export async function publishMenu(id: string, input: PublishMenuInput) {
  await getMenuById(id);
  return repo.publishMenu(id, input);
}

// ─── Sections ─────────────────────────────────────────────────────────────────

export async function addSection(menuId: string, input: CreateSectionInput) {
  await getMenuById(menuId);
  return repo.createSection(menuId, input);
}

export async function updateSection(sectionId: string, input: UpdateSectionInput) {
  const section = await repo.findSectionById(sectionId);
  if (!section) throw ApiError.notFound('Menu section');
  return repo.updateSection(sectionId, input);
}

export async function deleteSection(sectionId: string) {
  const section = await repo.findSectionById(sectionId);
  if (!section) throw ApiError.notFound('Menu section');
  return repo.deleteSection(sectionId);
}

// ─── Section items ────────────────────────────────────────────────────────────

export async function addItemToSection(sectionId: string, input: AddSectionItemInput) {
  const section = await repo.findSectionById(sectionId);
  if (!section) throw ApiError.notFound('Menu section');

  const item = await repo.findMenuItemById(input.menuItemId);
  if (!item) throw ApiError.notFound('Menu item');

  return repo.addItemToSection(sectionId, input);
}

export async function removeItemFromSection(sectionId: string, menuItemId: string) {
  const section = await repo.findSectionById(sectionId);
  if (!section) throw ApiError.notFound('Menu section');
  return repo.removeItemFromSection(sectionId, menuItemId);
}

export async function updateSectionItem(sectionId: string, menuItemId: string, input: UpdateSectionItemInput) {
  const section = await repo.findSectionById(sectionId);
  if (!section) throw ApiError.notFound('Menu section');
  return repo.updateSectionItem(sectionId, menuItemId, input);
}

export async function reorderSectionItems(sectionId: string, input: ReorderSectionItemsInput) {
  const section = await repo.findSectionById(sectionId);
  if (!section) throw ApiError.notFound('Menu section');
  return repo.reorderSectionItems(sectionId, input);
}

// ─── Menu Items ───────────────────────────────────────────────────────────────

export async function listMenuItems(input: ListMenuItemsInput) {
  return repo.findMenuItems(input);
}

export async function getMenuItemById(id: string) {
  const item = await repo.findMenuItemById(id);
  if (!item) throw ApiError.notFound('Menu item');
  return item;
}

export async function createMenuItem(input: CreateMenuItemInput) {
  return repo.createMenuItem(input);
}

export async function updateMenuItem(id: string, input: UpdateMenuItemInput) {
  await getMenuItemById(id);
  return repo.updateMenuItem(id, input);
}

export async function deleteMenuItem(id: string) {
  await getMenuItemById(id);
  return repo.softDeleteMenuItem(id);
}

