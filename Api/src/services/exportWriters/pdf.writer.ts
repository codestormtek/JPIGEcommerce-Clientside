import PDFDocument from 'pdfkit';
import type { ExportRow, ExportResult } from './index';

const PAGE_MARGIN = 40;
const COL_WIDTH = 110;
const ROW_HEIGHT = 16;
const FONT_SIZE = 8;
const HEADER_FONT_SIZE = 9;

export function writePdf(rows: ExportRow[]): Promise<ExportResult> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: PAGE_MARGIN, size: 'A4', layout: 'landscape' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => {
      resolve({
        buffer: Buffer.concat(chunks),
        mimeType: 'application/pdf',
        extension: 'pdf',
      });
    });
    doc.on('error', reject);

    const columns = rows.length > 0 ? Object.keys(rows[0]!) : [];
    const usableWidth = doc.page.width - PAGE_MARGIN * 2;
    const colW = columns.length > 0 ? Math.min(COL_WIDTH, usableWidth / columns.length) : COL_WIDTH;

    const drawRow = (values: string[], y: number, bold = false) => {
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? HEADER_FONT_SIZE : FONT_SIZE);
      values.forEach((val, i) => {
        const x = PAGE_MARGIN + i * colW;
        doc.text(val.substring(0, 18), x, y, { width: colW - 4, lineBreak: false });
      });
    };

    // Header
    doc.rect(PAGE_MARGIN, doc.y, usableWidth, ROW_HEIGHT).fill('#e8e8e8').stroke();
    drawRow(columns, doc.y + 3, true);
    let currentY = doc.y + ROW_HEIGHT + 2;

    // Data rows
    rows.forEach((row, idx) => {
      if (currentY + ROW_HEIGHT > doc.page.height - PAGE_MARGIN) {
        doc.addPage();
        currentY = PAGE_MARGIN;
      }
      if (idx % 2 === 0) {
        doc.rect(PAGE_MARGIN, currentY, usableWidth, ROW_HEIGHT).fill('#f8f8f8').stroke();
      }
      drawRow(columns.map((c) => String(row[c] ?? '')), currentY + 3);
      currentY += ROW_HEIGHT;
    });

    doc.end();
  });
}

