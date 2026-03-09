import { z } from 'zod';

export const updateSettingSchema = z.object({
  settingValue: z.string(),
});

export type UpdateSettingInput = z.infer<typeof updateSettingSchema>;

export const bulkUpdateSettingsSchema = z.object({
  settings: z.array(
    z.object({
      settingKey: z.string().min(1),
      settingValue: z.string(),
    })
  ),
});

export type BulkUpdateSettingsInput = z.infer<typeof bulkUpdateSettingsSchema>;
