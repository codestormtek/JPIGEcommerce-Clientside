import { z } from 'zod';

export const createPrinterSchema = z.object({
  name: z.string().trim().min(1, 'Printer name is required').max(100),
});
export type CreatePrinterInput = z.infer<typeof createPrinterSchema>;

export const updatePrinterSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
});
export type UpdatePrinterInput = z.infer<typeof updatePrinterSchema>;

export const printerIdSchema = z.object({ printerId: z.string().uuid() });
export const jobIdSchema = z.object({ jobId: z.string().uuid() });
export const printerJobParamsSchema = printerIdSchema.extend({ jobId: z.string().uuid() });

export const cloudPrntSettingsSchema = z.object({
  canonicalUrl: z.string().trim().url().max(500),
});
export type CloudPrntSettingsInput = z.infer<typeof cloudPrntSettingsSchema>;

// Star firmware sends a few different spellings depending on generation. The
// server only records operational metadata and ignores arbitrary request data.
export const printerPollSchema = z.object({
  // CloudPRNT defines statusCode as the only required POST field. It is a
  // printer-status value (for example "200%20OK"), not an HTTP status.
  statusCode: z.union([z.string().trim().min(1).max(160), z.number().int()]),
  status: z.string().max(2_000).nullable().optional(),
  printerMAC: z.string().trim().max(64).nullable().optional(),
  uniqueID: z.string().trim().max(128).nullable().optional(),
  printingInProgress: z.boolean().optional(),
  clientAction: z.array(z.unknown()).nullable().optional(),
  barcodeReader: z.array(z.unknown()).nullable().optional(),
  keyboard: z.array(z.unknown()).nullable().optional(),
  display: z.array(z.unknown()).nullable().optional(),
}).strip();

export const cloudPrntJobQuerySchema = z.object({
  // These are the documented CloudPRNT GET parameters. Basic credentials
  // authenticate the configured printer; CloudPRNT does not define a job token.
  type: z.string().trim().min(1).max(160),
  mac: z.string().trim().min(1).max(64),
});

export const cloudPrntCompletionQuerySchema = z.object({
  // These are the documented CloudPRNT DELETE parameters.
  mac: z.string().trim().min(1).max(64),
  code: z.string().trim().min(1).max(160),
});