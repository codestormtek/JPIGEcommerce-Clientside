import { ApiError } from '../../utils/apiError';
import * as repo from './site-settings.repository';
import type { UpdateSettingInput, BulkUpdateSettingsInput } from './site-settings.schema';

export async function getAllSettings() {
  return repo.findAll();
}

export async function getSettingByKey(key: string) {
  const setting = await repo.findByKey(key);
  if (!setting) throw ApiError.notFound('Site setting');
  return setting;
}

export async function updateSetting(key: string, input: UpdateSettingInput) {
  const existing = await repo.findByKey(key);
  if (!existing) throw ApiError.notFound('Site setting');
  return repo.upsert(key, input.settingValue);
}

export async function bulkUpdateSettings(input: BulkUpdateSettingsInput) {
  return repo.bulkUpsert(input.settings);
}
