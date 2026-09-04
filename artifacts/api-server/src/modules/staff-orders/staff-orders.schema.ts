import { z } from 'zod';

export const staffOrderListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['new', 'processing', 'ready', 'picked_up']).optional(),
  search: z.string().trim().max(100).optional(),
});

export const orderIdSchema = z.object({ orderId: z.string().uuid() });
export const tokenIdSchema = z.object({ tokenId: z.string().uuid() });

export const registerPushTokenSchema = z.object({
  token: z.string().trim().min(10).max(512).refine(
    (token) => /^ExponentPushToken\[[^\]]+\]$|^ExpoPushToken\[[^\]]+\]$/.test(token),
    'Invalid Expo push token',
  ),
  rolePreference: z.enum(['kitchen', 'cashier', 'both']),
  enabled: z.boolean().default(true),
});

export const updatePushTokenSchema = z.object({
  rolePreference: z.enum(['kitchen', 'cashier', 'both']).optional(),
  enabled: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, 'At least one field is required');

export type StaffOrderListInput = z.infer<typeof staffOrderListSchema>;
export type RegisterPushTokenInput = z.infer<typeof registerPushTokenSchema>;
export type UpdatePushTokenInput = z.infer<typeof updatePushTokenSchema>;