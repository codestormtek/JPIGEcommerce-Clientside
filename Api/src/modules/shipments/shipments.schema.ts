import { z } from 'zod';

// ─── List Shipments (admin) ───────────────────────────────────────────────────

export const listShipmentsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  orderId: z.string().uuid().optional(),
  status: z.enum(['pending', 'shipped', 'delivered', 'cancelled']).optional(),
  carrier: z.string().optional(),
  orderBy: z.enum(['createdAt', 'shippedAt', 'deliveredAt', 'status']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type ListShipmentsInput = z.infer<typeof listShipmentsSchema>;

// ─── Create Shipment (admin) ──────────────────────────────────────────────────

export const createShipmentSchema = z.object({
  orderId: z.string().uuid('Invalid order ID'),
  carrier: z.string().optional(),
  trackingNumber: z.string().optional(),
  status: z.enum(['pending', 'shipped', 'delivered', 'cancelled']).default('pending'),
  shippedAt: z.string().datetime().optional(),
  deliveredAt: z.string().datetime().optional(),
  items: z
    .array(
      z.object({
        orderLineId: z.string().uuid('Invalid order line ID'),
        qty: z.number().int().positive(),
      }),
    )
    .min(1, 'At least one item is required'),
});

export type CreateShipmentInput = z.infer<typeof createShipmentSchema>;

// ─── Update Shipment (admin) ──────────────────────────────────────────────────

export const updateShipmentSchema = z.object({
  carrier: z.string().optional(),
  trackingNumber: z.string().optional(),
  status: z.enum(['pending', 'shipped', 'delivered', 'cancelled']).optional(),
  shippedAt: z.string().datetime().optional(),
  deliveredAt: z.string().datetime().optional(),
});

export type UpdateShipmentInput = z.infer<typeof updateShipmentSchema>;

