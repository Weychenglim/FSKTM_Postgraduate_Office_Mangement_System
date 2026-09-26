import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PROGRAMME_OPTIONS } from '../constants/programmes';
import { CSV_HEADERS, CSV_TEMPLATE, reviewedFileName, rowsToCsv } from './csvImport';

// ── the template is the format the server accepts ────────────────────────────
const backendImport = readFileSync(resolve('../backend/accounts/registry_import.py'), 'utf8');
const serverHeaders = backendImport.match(/IMPORT_HEADERS = \[([^\]]*)\]/)?.[1] ?? '';
assert.deepEqual(
  [...serverHeaders.matchAll(/"([^"]+)"/g)].map((match) => match[1]),
  [...CSV_HEADERS],
  'frontend template headers must match accounts/registry_import.py',
);
assert.equal(CSV_TEMPLATE.split('\n')[0], CSV_HEADERS.join(','));
assert.ok(CSV_TEMPLATE.includes(PROGRAMME_OPTIONS[0]));

// ── reviewed rows go back as a CSV the server can read ───────────────────────
assert.equal(
  rowsToCsv([
    { id: 'WGA1', name: 'Tan, Mei Ling', programme: PROGRAMME_OPTIONS[1], email: 'mei@um.edu.my', phone: '' },
    { id: 'WGA2', name: 'Said "Sam" Ali', programme: PROGRAMME_OPTIONS[2], email: 'sam@um.edu.my', phone: '012-1' },
  ]),
  [
    'student_id,full_name,programme,email,phone',
    `WGA1,"Tan, Mei Ling",${PROGRAMME_OPTIONS[1]},mei@um.edu.my,`,
    `WGA2,"Said ""Sam"" Ali",${PROGRAMME_OPTIONS[2]},sam@um.edu.my,012-1`,
  ].join('\n'),
);

assert.equal(reviewedFileName('intake_2026.xlsx'), 'intake_2026-reviewed.csv');
assert.equal(reviewedFileName(undefined), 'student-import-reviewed.csv');

console.log('csv import format tests passed');
