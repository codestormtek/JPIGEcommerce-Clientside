import { ApiError } from '../../utils/apiError';
import { ListInventoryInput, CreateInventoryItemInput, UpdateInventoryItemInput } from './inventory.schema';
import * as repo from './inventory.repository';

export async function listInventory(input: ListInventoryInput) {
  return repo.findInventoryItems(input);
}

export async function getInventoryItemById(id: string) {
  const item = await repo.findInventoryItemById(id);
  if (!item) throw new ApiError(404, 'Inventory item not found');
  return item;
}

export async function createInventoryItem(input: CreateInventoryItemInput) {
  return repo.createInventoryItem(input);
}

export async function updateInventoryItem(id: string, input: UpdateInventoryItemInput) {
  await getInventoryItemById(id);
  return repo.updateInventoryItem(id, input);
}

export async function deleteInventoryItem(id: string): Promise<void> {
  await getInventoryItemById(id);
  await repo.deleteInventoryItem(id);
}

