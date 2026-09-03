import { z } from 'zod';

// ─── List locations ───────────────────────────────────────────────────────────

export const listLocationsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  isActive: z.coerce.boolean().optional(),
  orderBy: z.enum(['name']).default('name'),
  order: z.enum(['asc', 'desc']).default('asc'),
});

export type ListLocationsInput = z.infer<typeof listLocationsSchema>;

// ─── Create / Update Location ─────────────────────────────────────────────────

export const createLocationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  addressId: z.string().uuid().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type CreateLocationInput = z.infer<typeof createLocationSchema>;

export const updateLocationSchema = createLocationSchema.partial();
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;

// ─── List schedule events ─────────────────────────────────────────────────────

export const listEventsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  locationId: z.string().uuid().optional(),
  eventType: z.enum(['truck_stop', 'catering', 'festival', 'private']).optional(),
  status: z.enum(['scheduled', 'cancelled', 'completed']).optional(),
  isPublic: z.coerce.boolean().optional(),
  startFrom: z.coerce.date().optional(),
  startTo: z.coerce.date().optional(),
  orderBy: z.enum(['startTime', 'createdAt']).default('startTime'),
  order: z.enum(['asc', 'desc']).default('asc'),
});

export type ListEventsInput = z.infer<typeof listEventsSchema>;

// ─── Create / Update ScheduleEvent ───────────────────────────────────────────

export const createEventSchema = z.object({
  locationId: z.string().uuid('Invalid location ID'),
  menuId: z.string().uuid().optional(),
  title: z.string().min(1, 'Title is required'),
  eventType: z.enum(['truck_stop', 'catering', 'festival', 'private']),
  status: z.enum(['scheduled', 'cancelled', 'completed']).default('scheduled'),
  startTime: z.coerce.date(),
  endTime: z.coerce.date().optional(),
  description: z.string().optional(),
  isPublic: z.boolean().default(true),
  mediaAssetIds: z.array(z.string().uuid()).optional(),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;

export const updateEventSchema = createEventSchema.partial();
export type UpdateEventInput = z.infer<typeof updateEventSchema>;

