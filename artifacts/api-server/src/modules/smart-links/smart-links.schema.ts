import { z } from 'zod';

const slug = z.string().trim().toLowerCase()
  .min(3, 'Slug must be at least 3 characters')
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, and single hyphens only.');

const destination = z.string().trim().url().max(2_000).refine((value) => {
  try {
    const url = new URL(value);
    return (url.protocol === 'https:' || url.protocol === 'http:') && !url.username && !url.password;
  } catch {
    return false;
  }
}, 'Destination must be an HTTP(S) URL without embedded credentials.');

export const createSmartLinkSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(120),
  slug,
  targetUrl: destination,
  fallbackUrl: destination.optional().nullable(),
});
export type CreateSmartLinkInput = z.infer<typeof createSmartLinkSchema>;

// Slugs are intentionally absent: a link may never be retargeted by changing
// its printed/public identifier. Create a duplicate instead.
export const updateSmartLinkSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  targetUrl: destination.optional(),
  fallbackUrl: destination.optional().nullable(),
}).strict();
export type UpdateSmartLinkInput = z.infer<typeof updateSmartLinkSchema>;

export const smartLinkIdSchema = z.object({ id: z.string().uuid('Invalid smart link ID') });
export const publicSlugSchema = z.object({
  slug: slug.max(80),
});

const origin = z.string().trim().min(1).max(2_000);
export const smartLinkConfigSchema = z.object({
  canonicalOrigin: origin,
  allowedOrigins: z.array(origin).max(50),
}).strict();
export type SmartLinkConfigInput = z.infer<typeof smartLinkConfigSchema>;
