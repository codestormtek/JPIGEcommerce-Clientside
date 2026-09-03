import { z } from 'zod';

export const getRatesSchema = z.object({
  address: z.object({
    name: z.string().min(1),
    street1: z.string().min(1),
    street2: z.string().optional(),
    city: z.string().min(1),
    state: z.string().min(1),
    zip: z.string().min(1),
    country: z.string().default('US'),
    phone: z.string().optional(),
    email: z.string().email().optional(),
  }),
  items: z.array(
    z.object({
      productItemId: z.string().min(1),
      qty: z.number().int().positive(),
    })
  ).min(1),
});

export type GetRatesInput = z.infer<typeof getRatesSchema>;
