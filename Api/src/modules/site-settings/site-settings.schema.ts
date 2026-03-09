import { z } from 'zod';

export const createSettingSchema = z.object({
  settingKey: z.string().min(1).max(100).regex(/^[a-z0-9_]+$/, 'Key must be lowercase letters, numbers, and underscores only'),
  settingValue: z.string(),
  label: z.string().min(1).max(200),
  category: z.string().min(1).max(100),
});

export type CreateSettingInput = z.infer<typeof createSettingSchema>;

export const updateSettingSchema = z.object({
  settingValue: z.string().optional(),
  label: z.string().max(200).optional(),
  category: z.string().max(100).optional(),
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
