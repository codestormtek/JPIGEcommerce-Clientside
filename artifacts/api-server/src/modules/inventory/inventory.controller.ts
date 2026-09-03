import { Request, Response } from 'express';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from '../../utils/apiResponse';
import { ListInventoryInput, CreateInventoryItemInput, UpdateInventoryItemInput } from './inventory.schema';
import * as service from './inventory.service';

export async function listInventory(req: Request, res: Response): Promise<void> {
  const result = await service.listInventory(req.query as unknown as ListInventoryInput);
  sendPaginated(res, result);
}

export async function getInventoryItem(req: Request, res: Response): Promise<void> {
  const item = await service.getInventoryItemById(req.params.id);
  sendSuccess(res, item);
}

export async function createItem(req: Request, res: Response): Promise<void> {
  const item = await service.createInventoryItem(req.body as CreateInventoryItemInput);
  sendCreated(res, item);
}

export async function updateItem(req: Request, res: Response): Promise<void> {
  const item = await service.updateInventoryItem(req.params.id, req.body as UpdateInventoryItemInput);
  sendSuccess(res, item);
}

export async function deleteItem(req: Request, res: Response): Promise<void> {
  await service.deleteInventoryItem(req.params.id);
  sendNoContent(res);
}

