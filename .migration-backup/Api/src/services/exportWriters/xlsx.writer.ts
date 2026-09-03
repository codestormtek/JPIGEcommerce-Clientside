import ExcelJS from 'exceljs';
import type { ExportRow, ExportResult } from './index';

export async function writeXlsx(rows: ExportRow[]): Promise<ExportResult> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Export');

  const columns = rows.length > 0 ? Object.keys(rows[0]!) : [];

  // Header row (bold)
  sheet.columns = columns.map((col) => ({
    header: col,
    key: col,
    width: Math.max(col.length + 4, 14),
  }));
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };

  // Data rows
  rows.forEach((row) => sheet.addRow(row));

  const buffer = await workbook.xlsx.writeBuffer();
  return {
    buffer: Buffer.from(buffer),
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    extension: 'xlsx',
  };
}

