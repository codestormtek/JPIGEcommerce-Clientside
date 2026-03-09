import { ApiError } from '../../utils/apiError';
import * as repo from './site-settings.repository';
import type { CreateSettingInput, UpdateSettingInput, BulkUpdateSettingsInput } from './site-settings.schema';

export async function getAllSettings() {
  return repo.findAll();
}

export async function getSettingByKey(key: string) {
  const setting = await repo.findByKey(key);
  if (!setting) throw ApiError.notFound('Site setting');
  return setting;
}

export async function createSetting(input: CreateSettingInput) {
  const existing = await repo.findByKey(input.settingKey);
  if (existing) throw ApiError.conflict('A setting with this key already exists');
  return repo.create(input);
}

export async function updateSetting(key: string, input: UpdateSettingInput) {
  const existing = await repo.findByKey(key);
  if (!existing) throw ApiError.notFound('Site setting');
  return repo.update(key, input);
}

export async function deleteSetting(key: string) {
  const existing = await repo.findByKey(key);
  if (!existing) throw ApiError.notFound('Site setting');
  return repo.remove(key);
}

export async function bulkUpdateSettings(input: BulkUpdateSettingsInput) {
  return repo.bulkUpsert(input.settings);
}
