import { z } from 'zod';

// ─── Update Profile ────────────────────────────────────────────────────────────

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phoneNumber: z.string().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// ─── List Users (admin query params) ─────────────────────────────────────────

export const listUsersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  role: z.enum(['user', 'admin']).optional(),
  isActive: z.coerce.boolean().optional(),
  orderBy: z.enum(['createdAt', 'emailAddress']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type ListUsersInput = z.infer<typeof listUsersSchema>;

// ─── Update User (admin) ──────────────────────────────────────────────────────

export const adminUpdateUserSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phoneNumber: z.string().optional(),
  isActive: z.boolean().optional(),
  role: z.enum(['user', 'admin']).optional(),
});

export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;

// ─── Address ──────────────────────────────────────────────────────────────────

export const upsertAddressSchema = z.object({
  label: z.string().optional(),
  isDefault: z.boolean().default(false),
  address: z.object({
    addressLine1: z.string().min(1, 'Address line 1 is required'),
    addressLine2: z.string().optional(),
    city: z.string().min(1, 'City is required'),
    stateProvince: z.string().optional(),
    postalCode: z.string().optional(),
    countryId: z.string().uuid('Invalid country ID'),
  }),
});

export type UpsertAddressInput = z.infer<typeof upsertAddressSchema>;

// ─── Contact Preferences ──────────────────────────────────────────────────────

export const updateContactPreferencesSchema = z.object({
  optInEmail: z.boolean().optional(),
  optInSms: z.boolean().optional(),
  smsPhone: z.string().optional(),
  preferredLanguage: z.string().optional(),
  timezone: z.string().optional(),
});

export type UpdateContactPreferencesInput = z.infer<typeof updateContactPreferencesSchema>;

// ─── Reviews ──────────────────────────────────────────────────────────────────

export const createReviewSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  orderLineId: z.string().uuid().optional(),
  ratingValue: z.number().int().min(1).max(5),
  comment: z.string().optional(),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;

export const listReviewsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  isApproved: z.coerce.boolean().optional(),
  productId: z.string().uuid().optional(),
  orderBy: z.enum(['createdAt', 'ratingValue']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type ListReviewsInput = z.infer<typeof listReviewsSchema>;

// ─── Payment Method Tokens ────────────────────────────────────────────────────

export const addPaymentMethodSchema = z.object({
  provider: z.string().min(1, 'Provider is required'),
  token: z.string().min(1, 'Token is required'),
  brand: z.string().optional(),
  last4: z.string().length(4).optional(),
  expMonth: z.number().int().min(1).max(12).optional(),
  expYear: z.number().int().min(new Date().getFullYear()).optional(),
  isDefault: z.boolean().default(false),
});

export type AddPaymentMethodInput = z.infer<typeof addPaymentMethodSchema>;

