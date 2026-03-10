import { z } from 'zod';

export const createLiveSessionSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  locationName: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  lat: z.number().optional().nullable(),
  lng: z.number().optional().nullable(),
  message: z.string().optional().nullable(),
  startTime: z.string().optional().nullable(),
  endTime: z.string().optional().nullable(),
  status: z.enum(['DRAFT', 'SCHEDULED']).optional(),
});
export type CreateLiveSessionInput = z.infer<typeof createLiveSessionSchema>;

export const updateLiveSessionSchema = z.object({
  title: z.string().min(1).optional(),
  locationName: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  lat: z.number().optional().nullable(),
  lng: z.number().optional().nullable(),
  message: z.string().optional().nullable(),
  startTime: z.string().optional().nullable(),
  endTime: z.string().optional().nullable(),
  status: z.enum(['DRAFT', 'SCHEDULED']).optional(),
});
export type UpdateLiveSessionInput = z.infer<typeof updateLiveSessionSchema>;

export const listLiveSessionsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['DRAFT', 'SCHEDULED', 'LIVE', 'CLOSED', 'CANCELLED']).optional(),
  search: z.string().optional(),
  orderBy: z.enum(['createdAt', 'startTime', 'title']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});
export type ListLiveSessionsInput = z.infer<typeof listLiveSessionsSchema>;

export const goLiveSchema = z.object({
  message: z.string().optional().nullable(),
});
export type GoLiveInput = z.infer<typeof goLiveSchema>;

export const sendAlertSchema = z.object({
  messageBody: z.string().min(1, 'Message body is required'),
  audienceType: z.string().default('all'),
});
export type SendAlertInput = z.infer<typeof sendAlertSchema>;

export const testSmsSchema = z.object({
  to: z.string().min(1, 'Phone number is required'),
  body: z.string().optional(),
});
export type TestSmsInput = z.infer<typeof testSmsSchema>;

export const publicSubscribeSchema = z.object({
  name: z.string().optional().nullable(),
  phone: z.string().min(1, 'Phone number is required'),
  zip: z.string().optional().nullable(),
});
export type PublicSubscribeInput = z.infer<typeof publicSubscribeSchema>;

export const publicUnsubscribeSchema = z.object({
  phone: z.string().min(1, 'Phone number is required'),
});
export type PublicUnsubscribeInput = z.infer<typeof publicUnsubscribeSchema>;

export const alertHistorySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sessionId: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});
export type AlertHistoryInput = z.infer<typeof alertHistorySchema>;
