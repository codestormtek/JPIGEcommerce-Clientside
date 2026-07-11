import { z } from 'zod';

// ─── Kiosk order (device-authenticated, in-store pickup) ─────────────────────

export const kioskOrderSchema = z.object({
  lines: z
    .array(
      z.object({
        productItemId: z.string().min(1),
        qty: z.number().int().positive().max(50),
        /** For combo meals: chosen side product IDs (must match the combo's included side count) */
        sideProductIds: z.array(z.string().min(1)).max(10).optional(),
      }),
    )
    .min(1, 'At least one item is required')
    .max(50),
  customerName: z.string().min(1, 'Customer name is required').max(100),
  customerPhone: z.string().max(30).optional(),
  specialInstructions: z.string().max(500).optional(),
  /** 'terminal' pushes the checkout to the paired Square Terminal; 'card' uses an on-screen nonce */
  paymentMethod: z.enum(['terminal', 'card']),
  /** Square nonce (sourceId) from Web Payments SDK — required when paymentMethod = 'card' */
  squareNonce: z.string().optional(),
});

export type KioskOrderInput = z.infer<typeof kioskOrderSchema>;

// ─── Admin: kiosk device management ──────────────────────────────────────────

export const createKioskDeviceSchema = z.object({
  name: z.string().min(1, 'Device name is required').max(100),
});

export type CreateKioskDeviceInput = z.infer<typeof createKioskDeviceSchema>;

export const updateKioskDeviceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
  /** Square Terminal device_id to link (or null to unlink) */
  squareTerminalDeviceId: z.string().max(100).nullable().optional(),
});

export type UpdateKioskDeviceInput = z.infer<typeof updateKioskDeviceSchema>;
