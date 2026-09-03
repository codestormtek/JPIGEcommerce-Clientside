import { z } from 'zod';

const urlField = z
  .string()
  .min(1, 'URL is required')
  .refine(
    (v) => {
      const t = v.trim();
      return t === '#' || /^https?:\/\//i.test(t);
    },
    { message: 'URL must start with http:// or https://' }
  );

export const createSocialLinkSchema = z.object({
  platform: z.string().min(1, 'Platform is required'),
  iconClass: z.string().min(1, 'Icon is required'),
  url: urlField,
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export const updateSocialLinkSchema = z.object({
  platform: z.string().min(1).optional(),
  iconClass: z.string().min(1).optional(),
  url: urlField.optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export const reorderSocialLinksSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, 'ids must be a non-empty array'),
});

export type CreateSocialLinkInput = z.infer<typeof createSocialLinkSchema>;
export type UpdateSocialLinkInput = z.infer<typeof updateSocialLinkSchema>;
export type ReorderSocialLinksInput = z.infer<typeof reorderSocialLinksSchema>;
