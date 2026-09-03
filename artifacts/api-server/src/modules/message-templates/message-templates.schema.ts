import { z } from 'zod';

// ─── List ─────────────────────────────────────────────────────────────────────

export const listMessageTemplatesSchema = z.object({
  page:     z.coerce.number().int().positive().default(1),
  limit:    z.coerce.number().int().positive().max(100).default(20),
  channel:  z.enum(['email', 'sms']).optional(),
  audience: z.enum(['customer', 'admin']).optional(),
  isActive: z.coerce.boolean().optional(),
  search:   z.string().optional(),
  orderBy:  z.enum(['name', 'eventKey', 'createdAt', 'updatedAt']).default('name'),
  order:    z.enum(['asc', 'desc']).default('asc'),
});

export type ListMessageTemplatesInput = z.infer<typeof listMessageTemplatesSchema>;

// ─── Create ───────────────────────────────────────────────────────────────────

export const createMessageTemplateSchema = z.object({
  eventKey:        z.string().min(1).max(100),
  channel:         z.enum(['email', 'sms']),
  audience:        z.enum(['customer', 'admin']).default('customer'),
  locale:          z.string().min(2).max(10).default('en'),
  isActive:        z.boolean().default(true),
  name:            z.string().min(1).max(200),
  subject:         z.string().max(500).optional(),
  bodyHtml:        z.string().optional(),
  bodyText:        z.string().min(1),
  variablesSchema: z.string().optional(),
});

export type CreateMessageTemplateInput = z.infer<typeof createMessageTemplateSchema>;

// ─── Update ───────────────────────────────────────────────────────────────────

export const updateMessageTemplateSchema = createMessageTemplateSchema.partial();

export type UpdateMessageTemplateInput = z.infer<typeof updateMessageTemplateSchema>;

// ─── Test send ────────────────────────────────────────────────────────────────

export const testMessageTemplateSchema = z.object({
  testEmail: z.string().email(),
});

export type TestMessageTemplateInput = z.infer<typeof testMessageTemplateSchema>;

