/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

type CsvCell = string | number | boolean | null | undefined;

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => CsvCell;
}

const escapeCsvCell = (value: CsvCell): string => {
  const text = value === null || value === undefined ? '' : String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

export const buildCsv = <T,>(rows: T[], columns: CsvColumn<T>[]): string => {
  const header = columns.map((column) => escapeCsvCell(column.header)).join(',');
  const body = rows.map((row) =>
    columns.map((column) => escapeCsvCell(column.value(row))).join(',')
  );
  return [header, ...body].join('\r\n');
};

export const downloadCsv = <T,>(filename: string, rows: T[], columns: CsvColumn<T>[]): void => {
  const csv = buildCsv(rows, columns);
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
