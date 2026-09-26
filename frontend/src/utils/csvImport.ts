/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Student Registry bulk-import file format.
 *
 * Parsing and validation happen on the server (`accounts/registry_import.py`)
 * for both CSV and XLSX. This module only knows the column layout: it builds
 * the downloadable template and turns reviewed preview rows back into a CSV
 * so an edited set can be checked again or imported.
 */

import { PROGRAMME_OPTIONS } from '../constants/programmes';
import type { ImportPreviewRow } from '../types';

export const CSV_HEADERS = [
  'student_id',
  'full_name',
  'programme',
  'email',
  'phone',
] as const;

export const CSV_TEMPLATE = [
  CSV_HEADERS.join(','),
  `WGA260001,Nurul Huda binti Kamal,${PROGRAMME_OPTIONS[0]},wga260001@siswa.um.edu.my,012-3456789`,
  `WGA260002,Lim Wei Jie,${PROGRAMME_OPTIONS[1]},wga260002@siswa.um.edu.my,013-2223344`,
  '',
].join('\n');

const quote = (value: string) =>
  /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

export function rowsToCsv(rows: Pick<ImportPreviewRow, 'id' | 'name' | 'programme' | 'email' | 'phone'>[]): string {
  return [
    CSV_HEADERS.join(','),
    ...rows.map((r) => [r.id, r.name, r.programme, r.email, r.phone].map(quote).join(',')),
  ].join('\n');
}

export function reviewedFileName(original: string | undefined): string {
  const base = (original ?? 'student-import').replace(/\.[^.]+$/, '');
  return `${base}-reviewed.csv`;
}
