import { z } from 'zod';

// ─── List orders ──────────────────────────────────────────────────────────────

export const listOrdersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  // admin-only filter
  userId: z.string().uuid().optional(),
  statusId: z.string().uuid().optional(),
  orderType: z.enum(['retail', 'catering']).optional(),
  orderBy: z.enum(['orderDate', 'grandTotal']).default('orderDate'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type ListOrdersInput = z.infer<typeof listOrdersSchema>;

// ─── Place order (checkout) ───────────────────────────────────────────────────

const orderLineSchema = z.object({
  productItemId: z.string().min(1, 'Product item ID is required'),
  qty: z.number().int().positive('Quantity must be at least 1'),
});

const orderAddressSchema = z.object({
  addressType: z.enum(['shipping', 'billing']),
  fullName: z.string().optional(),
  phone: z.string().optional(),
  addressLine1: z.string().min(1),
  addressLine2: z.string().optional(),
  city: z.string().min(1),
  region: z.string().optional(),
  postalCode: z.string().min(1),
  countryName: z.string().min(1),
  countryIso2: z.string().length(2).optional(),
});

export const placeOrderSchema = z.object({
  lines: z.array(orderLineSchema).min(1, 'At least one item is required'),
  addresses: z.array(orderAddressSchema).min(1, 'At least one address is required'),
  shippingMethodId: z.string().min(1).optional(),
  specialInstructions: z.string().optional(),
  currency: z.string().length(3).default('USD'),
  orderType: z.enum(['retail', 'catering']).default('retail'),
  /** UUID of a saved PaymentMethodToken to charge at checkout */
  paymentMethodTokenId: z.string().uuid().optional(),
  /** Optional coupon code to apply a discount at checkout */
  couponCode: z.string().optional(),
  /** Shippo rate fields — set when customer selects a live carrier rate at checkout */
  shippoRateId: z.string().optional(),
  shippoRateAmount: z.number().nonnegative().optional(),
  shippoCarrier: z.string().optional(),
  shippoServiceLevel: z.string().optional(),
});

export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;
export type OrderLineInput = z.infer<typeof orderLineSchema>;
export type OrderAddressInput = z.infer<typeof orderAddressSchema>;

// ─── Update order status (admin) ──────────────────────────────────────────────

export const updateOrderStatusSchema = z.object({
  statusId: z.string().uuid('Invalid status ID'),
  note: z.string().optional(),
});

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

// ─── Email invoice (admin) ────────────────────────────────────────────────────

export const emailInvoiceSchema = z.object({
  emailTo: z.string().email('Invalid email address'),
});

export type EmailInvoiceInput = z.infer<typeof emailInvoiceSchema>;

