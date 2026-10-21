import type { CsvColumn } from './csvExport';

export type ExportColumn<T> = CsvColumn<T>;
export const EXCEL_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** Generate a real workbook. Strings always stay literal, including formula-like text. */
export async function buildExcel<T>(rows: T[], columns: ExportColumn<T>[]): Promise<Blob> {
  if (rows.length > 1_048_575 || columns.length > 16_384 || columns.length === 0) {
    throw new Error('The matching records exceed Excel worksheet limits. Narrow the filters and try again.');
  }
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Records', { views: [{ state: 'frozen', ySplit: 1 }] });
  const cell = (value: string | number | boolean | null | undefined) => {
    if (typeof value === 'string' && value.length > 32_767) throw new Error('A record exceeds Excel’s 32,767 character cell limit. The export could not be completed.');
    return value ?? null;
  };
  sheet.addRow(columns.map(column => cell(column.header)));
  for (const record of rows) sheet.addRow(columns.map(column => cell(column.value(record))));
  sheet.getRow(1).font = { name: 'Calibri', bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  sheet.getRow(1).height = 28;
  sheet.columns.forEach(column => {
    let width = 14;
    column.eachCell({ includeEmpty: false }, value => { width = Math.max(width, Math.min(48, String(value.value).length + 2)); });
    column.width = width;
    column.alignment = { vertical: 'top', wrapText: true };
  });
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([new Uint8Array(buffer)], { type: EXCEL_MIME });
}

export async function downloadExcel<T>(filename: string, rows: T[], columns: ExportColumn<T>[]): Promise<void> {
  const blob = await buildExcel(rows, columns);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename.replace(/\.(csv|xlsx)$/i, '') + '.xlsx';
  try {
    document.body.appendChild(anchor);
    anchor.click();
  } finally {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }
}
