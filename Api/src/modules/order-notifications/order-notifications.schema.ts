import { z } from 'zod';

const phone = z
  .string()
  .min(7, 'Enter a valid phone number')
  .max(20, 'Phone number is too long');

export const createRecipientSchema = z.object({
  label: z.string().max(80).optional().nullable(),
  phoneNumber: phone,
  isActive: z.boolean().optional().default(true),
});
export type CreateRecipientInput = z.infer<typeof createRecipientSchema>;

export const updateRecipientSchema = z.object({
  label: z.string().max(80).optional().nullable(),
  phoneNumber: phone.optional(),
  isActive: z.boolean().optional(),
});
export type UpdateRecipientInput = z.infer<typeof updateRecipientSchema>;
