/**
 * exportWriters/index.ts
 *
 * Dispatches to the correct format writer and returns a Buffer + MIME type.
 */

export type ExportRow = Record<string, string | number | boolean | null | undefined>;

export interface ExportResult {
  buffer: Buffer;
  mimeType: string;
  extension: string;
}

import { writeCsv } from './csv.writer';
import { writeXlsx } from './xlsx.writer';
import { writePdf } from './pdf.writer';
import { writeTxt } from './txt.writer';

export type ExportFormat = 'csv' | 'xlsx' | 'pdf' | 'txt';

export async function writeExport(
  rows: ExportRow[],
  format: ExportFormat,
): Promise<ExportResult> {
  switch (format) {
    case 'csv':
      return writeCsv(rows);
    case 'xlsx':
      return writeXlsx(rows);
    case 'pdf':
      return writePdf(rows);
    case 'txt':
      return writeTxt(rows);
    default:
      throw new Error(`Unsupported export format: ${String(format)}`);
  }
}

