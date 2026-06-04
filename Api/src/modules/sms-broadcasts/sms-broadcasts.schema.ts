import { z } from 'zod';

export const SUBSCRIPTION_TOPICS = ['sales', 'truck_schedule', 'menu_updates', 'news'] as const;

export const audienceTypeEnum = z.enum(['all', 'topic']);

export const previewAudienceSchema = z.object({
  audienceType: audienceTypeEnum.default('all'),
  audienceTopic: z.string().optional().nullable(),
});
export type PreviewAudienceInput = z.infer<typeof previewAudienceSchema>;

export const sendBroadcastSchema = z
  .object({
    title: z.string().max(120).optional().nullable(),
    messageBody: z.string().min(1, 'Message body is required').max(1600),
    audienceType: audienceTypeEnum.default('all'),
    audienceTopic: z.string().optional().nullable(),
  })
  .refine((d) => d.audienceType !== 'topic' || !!d.audienceTopic, {
    message: 'A topic is required when targeting a topic audience',
    path: ['audienceTopic'],
  });
export type SendBroadcastInput = z.infer<typeof sendBroadcastSchema>;

export const listBroadcastsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});
export type ListBroadcastsInput = z.infer<typeof listBroadcastsSchema>;
