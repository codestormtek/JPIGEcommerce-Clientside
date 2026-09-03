import { Request, Response } from 'express';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from '../../utils/apiResponse';
import {
  ListMenusInput, CreateMenuInput, UpdateMenuInput,
  CreateSectionInput, UpdateSectionInput, AddSectionItemInput, UpdateSectionItemInput,
  ListMenuItemsInput, CreateMenuItemInput, UpdateMenuItemInput,
  PublishMenuInput, ReorderSectionItemsInput,
} from './menus.schema';
import * as service from './menus.service';

// ─── Menus ────────────────────────────────────────────────────────────────────

export async function listMenus(req: Request, res: Response): Promise<void> {
  const result = await service.listMenus(req.query as unknown as ListMenusInput);
  sendPaginated(res, result);
}

export async function getMenuById(req: Request, res: Response): Promise<void> {
  const menu = await service.getMenuById(req.params['id'] as string);
  sendSuccess(res, menu);
}

export async function createMenu(req: Request, res: Response): Promise<void> {
  const menu = await service.createMenu(req.body as CreateMenuInput);
  sendCreated(res, menu, 'Menu created');
}

export async function updateMenu(req: Request, res: Response): Promise<void> {
  const menu = await service.updateMenu(req.params['id'] as string, req.body as UpdateMenuInput);
  sendSuccess(res, menu, 'Menu updated');
}

export async function deleteMenu(req: Request, res: Response): Promise<void> {
  await service.deleteMenu(req.params['id'] as string);
  sendNoContent(res);
}

export async function getMenuBuilder(req: Request, res: Response): Promise<void> {
  const menu = await service.getMenuBuilder(req.params['id'] as string);
  sendSuccess(res, menu);
}

export async function publishMenu(req: Request, res: Response): Promise<void> {
  const menu = await service.publishMenu(req.params['id'] as string, req.body as PublishMenuInput);
  sendSuccess(res, menu, 'Menu published');
}

// ─── Sections ─────────────────────────────────────────────────────────────────

export async function addSection(req: Request, res: Response): Promise<void> {
  const section = await service.addSection(req.params['id'] as string, req.body as CreateSectionInput);
  sendCreated(res, section, 'Section added');
}

export async function updateSection(req: Request, res: Response): Promise<void> {
  const section = await service.updateSection(req.params['sectionId'] as string, req.body as UpdateSectionInput);
  sendSuccess(res, section, 'Section updated');
}

export async function deleteSection(req: Request, res: Response): Promise<void> {
  await service.deleteSection(req.params['sectionId'] as string);
  sendNoContent(res);
}

// ─── Section items ─────────────────────────────────────────────────────────────

export async function addItemToSection(req: Request, res: Response): Promise<void> {
  const item = await service.addItemToSection(req.params['sectionId'] as string, req.body as AddSectionItemInput);
  sendCreated(res, item, 'Item added to section');
}

export async function removeItemFromSection(req: Request, res: Response): Promise<void> {
  await service.removeItemFromSection(req.params['sectionId'] as string, req.params['menuItemId'] as string);
  sendNoContent(res);
}

export async function updateSectionItem(req: Request, res: Response): Promise<void> {
  const item = await service.updateSectionItem(
    req.params['sectionId'] as string,
    req.params['menuItemId'] as string,
    req.body as UpdateSectionItemInput,
  );
  sendSuccess(res, item, 'Section item updated');
}

export async function reorderSectionItems(req: Request, res: Response): Promise<void> {
  await service.reorderSectionItems(req.params['sectionId'] as string, req.body as ReorderSectionItemsInput);
  sendNoContent(res);
}

// ─── Menu Items ───────────────────────────────────────────────────────────────

export async function listMenuItems(req: Request, res: Response): Promise<void> {
  const result = await service.listMenuItems(req.query as unknown as ListMenuItemsInput);
  sendPaginated(res, result);
}

export async function getMenuItemById(req: Request, res: Response): Promise<void> {
  const item = await service.getMenuItemById(req.params['itemId'] as string);
  sendSuccess(res, item);
}

export async function createMenuItem(req: Request, res: Response): Promise<void> {
  const item = await service.createMenuItem(req.body as CreateMenuItemInput);
  sendCreated(res, item, 'Menu item created');
}

export async function updateMenuItem(req: Request, res: Response): Promise<void> {
  const item = await service.updateMenuItem(req.params['itemId'] as string, req.body as UpdateMenuItemInput);
  sendSuccess(res, item, 'Menu item updated');
}

export async function deleteMenuItem(req: Request, res: Response): Promise<void> {
  await service.deleteMenuItem(req.params['itemId'] as string);
  sendNoContent(res);
}

