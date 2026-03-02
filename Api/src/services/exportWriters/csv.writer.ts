import { stringify } from 'csv-stringify/sync';
import type { ExportRow, ExportResult } from './index';

export function writeCsv(rows: ExportRow[]): ExportResult {
  const columns = rows.length > 0 ? Object.keys(rows[0]!) : [];
  const records = rows.map((row) => columns.map((col) => row[col] ?? ''));

  const csv = stringify([columns, ...records]);
  return {
    buffer: Buffer.from(csv, 'utf8'),
    mimeType: 'text/csv',
    extension: 'csv',
  };
}

