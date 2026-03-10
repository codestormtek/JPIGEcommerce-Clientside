import { z } from 'zod';

// ─── Menu Items ──────────────────────────────────────────────────────────────

export const createCateringMenuItemSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  category: z.enum(['MEAT', 'SIDE', 'BREAD', 'SAUCE', 'DRINK', 'DESSERT']),
  description: z.string().optional(),
  pricingType: z.enum([
    'PER_LB', 'PER_RACK', 'PER_DOZEN', 'PER_PIECE',
    'PER_HALF_PAN', 'PER_FULL_PAN', 'PER_GALLON', 'PER_BOTTLE',
  ]),
  unitPrice: z.number().positive('Unit price must be positive'),
  isPremium: z.boolean().optional(),
  isActive: z.boolean().optional(),
  minOrderQty: z.number().positive().optional().nullable(),
  maxOrderQty: z.number().positive().optional().nullable(),
  portionUnit: z.string().optional().nullable(),
  displayOrder: z.number().int().optional(),
  mediaAssetId: z.string().uuid().optional().nullable(),
});
export type CreateCateringMenuItemInput = z.infer<typeof createCateringMenuItemSchema>;

export const updateCateringMenuItemSchema = createCateringMenuItemSchema.partial();
export type UpdateCateringMenuItemInput = z.infer<typeof updateCateringMenuItemSchema>;

export const listCateringMenuItemsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  category: z.enum(['MEAT', 'SIDE', 'BREAD', 'SAUCE', 'DRINK', 'DESSERT']).optional(),
  isActive: z.coerce.boolean().optional(),
  includeDeleted: z.coerce.boolean().optional(),
});
export type ListCateringMenuItemsInput = z.infer<typeof listCateringMenuItemsSchema>;

// ─── Portion Rules ───────────────────────────────────────────────────────────

export const createPortionRuleSchema = z.object({
  menuItemId: z.string().uuid(),
  appetiteLevel: z.enum(['LIGHT', 'MODERATE', 'HEAVY']),
  qtyPerPerson: z.number().positive(),
  unitOfMeasure: z.string().min(1),
  minGuests: z.number().int().positive().optional().nullable(),
  maxGuests: z.number().int().positive().optional().nullable(),
  notes: z.string().optional().nullable(),
});
export type CreatePortionRuleInput = z.infer<typeof createPortionRuleSchema>;

export const updatePortionRuleSchema = createPortionRuleSchema.partial();
export type UpdatePortionRuleInput = z.infer<typeof updatePortionRuleSchema>;

export const listPortionRulesSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  menuItemId: z.string().uuid().optional(),
  appetiteLevel: z.enum(['LIGHT', 'MODERATE', 'HEAVY']).optional(),
});
export type ListPortionRulesInput = z.infer<typeof listPortionRulesSchema>;

// ─── Packages ────────────────────────────────────────────────────────────────

const packageTierSchema = z.object({
  id: z.string().uuid().optional(),
  tierLabel: z.string().optional().nullable(),
  minGuests: z.number().int().positive(),
  maxGuests: z.number().int().positive(),
  pricePerPerson: z.number().positive(),
  flatPrice: z.number().positive().optional().nullable(),
  displayOrder: z.number().int().optional(),
});

const packageItemSchema = z.object({
  id: z.string().uuid().optional(),
  menuItemId: z.string().uuid(),
  isRequired: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
});

export const createPackageSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1),
  description: z.string().optional().nullable(),
  includedMeatCount: z.number().int().min(0).optional(),
  includedSideCount: z.number().int().min(0).optional(),
  includedSauceCount: z.number().int().min(0).optional(),
  includesRolls: z.boolean().optional(),
  includesTea: z.boolean().optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
  mediaAssetId: z.string().uuid().optional().nullable(),
  tiers: z.array(packageTierSchema).optional(),
  items: z.array(packageItemSchema).optional(),
});
export type CreatePackageInput = z.infer<typeof createPackageSchema>;

export const updatePackageSchema = createPackageSchema.partial();
export type UpdatePackageInput = z.infer<typeof updatePackageSchema>;

export const listPackagesSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  isActive: z.coerce.boolean().optional(),
  includeDeleted: z.coerce.boolean().optional(),
});
export type ListPackagesInput = z.infer<typeof listPackagesSchema>;

// ─── Delivery Zones ──────────────────────────────────────────────────────────

export const createDeliveryZoneSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  zipCodes: z.array(z.string()).min(1, 'At least one ZIP code is required'),
  radiusMiles: z.number().positive().optional().nullable(),
  fee: z.number().min(0),
  minOrderAmount: z.number().positive().optional().nullable(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
});
export type CreateDeliveryZoneInput = z.infer<typeof createDeliveryZoneSchema>;

export const updateDeliveryZoneSchema = createDeliveryZoneSchema.partial();
export type UpdateDeliveryZoneInput = z.infer<typeof updateDeliveryZoneSchema>;

export const listDeliveryZonesSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  isActive: z.coerce.boolean().optional(),
});
export type ListDeliveryZonesInput = z.infer<typeof listDeliveryZonesSchema>;

// ─── Availability ────────────────────────────────────────────────────────────

export const createAvailabilitySchema = z.object({
  blockedDate: z.string().optional().nullable(),
  maxOrdersPerDay: z.number().int().positive().optional(),
  leadTimeDays: z.number().int().min(0).optional(),
  cutoffHour: z.number().int().min(0).max(23).optional(),
  reason: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});
export type CreateAvailabilityInput = z.infer<typeof createAvailabilitySchema>;

export const updateAvailabilitySchema = createAvailabilitySchema.partial();
export type UpdateAvailabilityInput = z.infer<typeof updateAvailabilitySchema>;

export const listAvailabilitySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  isActive: z.coerce.boolean().optional(),
});
export type ListAvailabilityInput = z.infer<typeof listAvailabilitySchema>;

// ─── Quotes ──────────────────────────────────────────────────────────────────

const quoteItemSchema = z.object({
  menuItemId: z.string().uuid().optional().nullable(),
  itemName: z.string().min(1),
  quantity: z.number().positive(),
  unitOfMeasure: z.string().min(1),
  unitPrice: z.number().min(0),
  lineTotal: z.number().min(0),
  isPackageItem: z.boolean().optional(),
  packageId: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const submitQuoteSchema = z.object({
  customerName: z.string().min(1, 'Name is required'),
  customerEmail: z.string().email('Valid email is required'),
  customerPhone: z.string().optional().nullable(),
  eventDate: z.string().min(1, 'Event date is required'),
  eventTime: z.string().optional().nullable(),
  eventType: z.string().optional().nullable(),
  guestCount: z.number().int().positive('Guest count must be at least 1'),
  appetiteLevel: z.enum(['LIGHT', 'MODERATE', 'HEAVY']).optional(),
  serviceStyle: z.enum(['DROP_OFF', 'DROP_OFF_SETUP']).optional(),
  deliveryZip: z.string().optional().nullable(),
  deliveryAddress: z.string().optional().nullable(),
  deliveryNotes: z.string().optional().nullable(),
  allergyNotes: z.string().optional().nullable(),
  setupRequested: z.boolean().optional(),
  disposableKit: z.boolean().optional(),
  foodSubtotal: z.number().min(0),
  deliveryFee: z.number().min(0).optional(),
  setupFee: z.number().min(0).optional(),
  totalEstimate: z.number().min(0),
  items: z.array(quoteItemSchema).min(1, 'At least one item is required'),
});
export type SubmitQuoteInput = z.infer<typeof submitQuoteSchema>;

export const updateQuoteSchema = z.object({
  status: z.enum(['DRAFT', 'PENDING', 'QUOTED', 'APPROVED', 'REJECTED', 'CONVERTED', 'EXPIRED']).optional(),
  adminNotes: z.string().optional().nullable(),
  totalEstimate: z.number().min(0).optional(),
  foodSubtotal: z.number().min(0).optional(),
  deliveryFee: z.number().min(0).optional(),
  setupFee: z.number().min(0).optional(),
  expiresAt: z.string().optional().nullable(),
});
export type UpdateQuoteInput = z.infer<typeof updateQuoteSchema>;

export const listQuotesSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['DRAFT', 'PENDING', 'QUOTED', 'APPROVED', 'REJECTED', 'CONVERTED', 'EXPIRED']).optional(),
  eventType: z.string().optional(),
  search: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  orderBy: z.enum(['createdAt', 'eventDate', 'totalEstimate', 'guestCount']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});
export type ListQuotesInput = z.infer<typeof listQuotesSchema>;

// ─── Estimate (public) ──────────────────────────────────────────────────────

const estimateItemSchema = z.object({
  menuItemId: z.string().uuid(),
  quantity: z.number().positive().optional(),
});

export const calculateEstimateSchema = z.object({
  guestCount: z.number().int().positive('Guest count must be at least 1'),
  appetiteLevel: z.enum(['LIGHT', 'MODERATE', 'HEAVY']).optional(),
  selectedItems: z.array(estimateItemSchema).min(1),
  deliveryZip: z.string().optional().nullable(),
  setupRequested: z.boolean().optional(),
  disposableKit: z.boolean().optional(),
});
export type CalculateEstimateInput = z.infer<typeof calculateEstimateSchema>;

// ─── Delivery Fee Check ──────────────────────────────────────────────────────

export const deliveryFeeCheckSchema = z.object({
  zip: z.string().min(1, 'ZIP code is required'),
});
export type DeliveryFeeCheckInput = z.infer<typeof deliveryFeeCheckSchema>;

// ─── Availability Check ─────────────────────────────────────────────────────

export const availabilityCheckSchema = z.object({
  date: z.string().min(1, 'Date is required'),
});
export type AvailabilityCheckInput = z.infer<typeof availabilityCheckSchema>;
