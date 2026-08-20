/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Parsing and validation for the Student Registry bulk-import CSV.
 *
 * Pure functions so the rules can be tested without a DOM. The registry screen
 * previously staged four hardcoded demo rows regardless of the uploaded file;
 * once the commit button was wired to the live backend that would have written
 * fictional accounts into the database, so parsing here is the real thing.
 */

import { PROGRAMME_OPTIONS } from '../constants/programmes';

export type ImportRowStatus = 'Ready' | 'Missing Email' | 'Missing Field' | 'Bad Programme' | 'Duplicate In File';

export interface ParsedImportRow {
  id: string;
  name: string;
  programme: string;
  email: string;
  phone: string;
  status: ImportRowStatus;
  issue: string;
  line: number;
}

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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Split one CSV line, honouring double-quoted fields containing commas. */
export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      out.push(field);
      field = '';
    } else {
      field += ch;
    }
  }
  out.push(field);
  return out.map((f) => f.trim());
}

export function normaliseProgramme(value: string): string | null {
  const cleaned = value.trim().toUpperCase();
  return PROGRAMME_OPTIONS.find((p) => p.toUpperCase() === cleaned) ?? null;
}

export interface ParseResult {
  rows: ParsedImportRow[];
  fatal: string | null;
}

/**
 * Parse the uploaded CSV into preview rows.
 *
 * Rows are never auto-corrected: a row missing an email or carrying an
 * unrecognised programme is reported so a human fixes it. Inventing an
 * identity would attach a real account to the wrong mailbox.
 */
export function parseStudentCsv(text: string): ParseResult {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return { rows: [], fatal: 'The file is empty.' };

  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const missing = CSV_HEADERS.filter((h) => !header.includes(h));
  if (missing.length > 0) {
    return {
      rows: [],
      fatal: `Missing required column(s): ${missing.join(', ')}. Download the template for the expected format.`,
    };
  }

  const index = Object.fromEntries(CSV_HEADERS.map((h) => [h, header.indexOf(h)]));

  // First occurrence of each id, computed up front. Doing this inline with the
  // other checks meant a row that failed an earlier rule never registered its
  // id, so a later duplicate of it was reported as Ready.
  const firstSeen = new Map<string, number>();
  for (let i = 1; i < lines.length; i += 1) {
    const id = (splitCsvLine(lines[i])[index.student_id] ?? '').trim().toLowerCase();
    if (id && !firstSeen.has(id)) firstSeen.set(id, i + 1);
  }

  const rows: ParsedImportRow[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const cells = splitCsvLine(lines[i]);
    const id = cells[index.student_id] ?? '';
    const name = cells[index.full_name] ?? '';
    const rawProgramme = cells[index.programme] ?? '';
    const email = cells[index.email] ?? '';
    const phone = cells[index.phone] ?? '';

    let status: ImportRowStatus = 'Ready';
    let issue = '';

    const programme = normaliseProgramme(rawProgramme);

    const duplicateOf = id ? firstSeen.get(id.toLowerCase()) : undefined;

    if (!id || !name) {
      status = 'Missing Field';
      issue = !id ? 'student_id is required' : 'full_name is required';
    } else if (duplicateOf !== undefined && duplicateOf !== i + 1) {
      status = 'Duplicate In File';
      issue = `same student_id as line ${duplicateOf}`;
    } else if (!email) {
      status = 'Missing Email';
      issue = 'email is required — the student needs it to activate the account';
    } else if (!EMAIL_RE.test(email)) {
      status = 'Missing Email';
      issue = `"${email}" is not a valid email address`;
    } else if (!programme) {
      status = 'Bad Programme';
      issue = `"${rawProgramme}" is not an approved programme`;
    }

    rows.push({
      id,
      name,
      programme: programme ?? rawProgramme,
      email,
      phone,
      status,
      issue,
      line: i + 1,
    });
  }

  if (rows.length === 0) {
    return { rows: [], fatal: 'The file has a header row but no student rows.' };
  }
  return { rows, fatal: null };
}

export const readyRows = (rows: ParsedImportRow[]) => rows.filter((r) => r.status === 'Ready');

/**
 * Re-apply the same validation to rows a reviewer has edited in place.
 *
 * Rebuilding a CSV and re-parsing keeps exactly one implementation of the
 * rules, so an edited row can never be marked Ready by a looser check.
 */
export function revalidateRows(rows: ParsedImportRow[]): ParsedImportRow[] {
  const quote = (v: string) => (v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v);
  const csv = [
    CSV_HEADERS.join(','),
    ...rows.map((r) => [r.id, r.name, r.programme, r.email, r.phone].map(quote).join(',')),
  ].join('\n');
  const { rows: reparsed } = parseStudentCsv(csv);
  return reparsed.length === rows.length ? reparsed : rows;
}
