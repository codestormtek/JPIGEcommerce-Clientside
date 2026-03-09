import { Request, Response } from 'express';
import { AuthRequest } from '../../types';
import { sendSuccess } from '../../utils/apiResponse';
import * as service from './site-settings.service';
import type { UpdateSettingInput, BulkUpdateSettingsInput } from './site-settings.schema';

export async function getPublicSettings(_req: Request, res: Response): Promise<void> {
  const settings = await service.getAllSettings();
  const map: Record<string, string> = {};
  for (const s of settings) {
    map[s.settingKey] = s.settingValue;
  }
  sendSuccess(res, map);
}

export async function getSettingByKey(req: Request, res: Response): Promise<void> {
  const setting = await service.getSettingByKey(req.params['key'] as string);
  sendSuccess(res, setting);
}

export async function getAllSettings(_req: Request, res: Response): Promise<void> {
  const settings = await service.getAllSettings();
  sendSuccess(res, settings);
}

export async function updateSetting(req: AuthRequest, res: Response): Promise<void> {
  const setting = await service.updateSetting(
    req.params['key'] as string,
    req.body as UpdateSettingInput
  );
  sendSuccess(res, setting, 'Setting updated');
}

export async function bulkUpdateSettings(req: AuthRequest, res: Response): Promise<void> {
  const results = await service.bulkUpdateSettings(req.body as BulkUpdateSettingsInput);
  sendSuccess(res, results, 'Settings updated');
}
