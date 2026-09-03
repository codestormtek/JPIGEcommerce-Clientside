import type { ExportRow, ExportResult } from './index';

export function writeTxt(rows: ExportRow[]): ExportResult {
  const columns = rows.length > 0 ? Object.keys(rows[0]!) : [];
  const lines: string[] = [columns.join('\t')];

  rows.forEach((row) => {
    lines.push(columns.map((col) => String(row[col] ?? '')).join('\t'));
  });

  return {
    buffer: Buffer.from(lines.join('\n'), 'utf8'),
    mimeType: 'text/plain',
    extension: 'txt',
  };
}

