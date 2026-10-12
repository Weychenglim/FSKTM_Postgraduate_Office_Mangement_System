import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { ImportColumn, ImportField, ImportMapping, ImportPreviewRow, RegistryImportBatch } from '../types';
import {
  BATCH_PROBLEM_COLUMNS,
  IMPORT_REPORT_COLUMNS,
  batchSummary,
  columnLabel,
  differenceWarning,
  filterImportRows,
  importOutcome,
  mappingProblems,
  unusedColumns,
  registryMatchText,
  repeatedText,
  rowExplanation,
  skipNotice,
  summariseImportRows,
} from './registryImport';
import { buildCsv } from './csvExport';

const row = (overrides: Partial<ImportPreviewRow>): ImportPreviewRow => ({
  line: 2,
  id: 'WGA260001',
  name: 'Aisyah Rahman',
  programme: 'MASTER OF DATA SCIENCE (COURSEWORK)',
  email: 'aisyah@example.test',
  phone: '',
  status: 'Ready',
  issue: '',
  ...overrides,
});

const registered = row({
  line: 3,
  status: 'Already Registered',
  issue: 'this matric number is already registered',
  matchedBy: 'studentId',
  existing: {
    id: 'WGA250001',
    name: 'Existing Student',
    email: 'existing@example.test',
    programme: 'MASTER OF DATA SCIENCE (COURSEWORK)',
    academicStatus: 'Active',
    role: 'Student',
  },
  differences: ['name'],
});
const repeated = row({ line: 4, status: 'Duplicate In File', issue: 'same student_id as line 2', duplicateOf: 2 });
const badProgramme = row({ line: 5, status: 'Bad Programme', issue: '"X" is not an approved programme' });
const rows = [row({}), registered, repeated, badProgramme];

// counts and groups
assert.deepEqual(summariseImportRows(rows), {
  total: 4,
  ready: 1,
  alreadyRegistered: 1,
  repeated: 1,
  skipped: 2,
  fix: 1,
});
assert.deepEqual(filterImportRows(rows, 'skipped').map((r) => r.line), [3, 4]);
assert.deepEqual(filterImportRows(rows, 'fix').map((r) => r.line), [5]);
assert.equal(filterImportRows(rows, 'all').length, 4);

// the office is told who is skipped, and why
assert.equal(skipNotice(summariseImportRows(rows)), '1 already-registered student and 1 repeated row will be skipped.');
assert.equal(
  skipNotice(summariseImportRows([registered, registered, row({})])),
  '2 already-registered students will be skipped.',
);
assert.equal(skipNotice(summariseImportRows([row({})])), '');
assert.equal(registryMatchText(registered), 'In the registry as Existing Student (WGA250001), Data Science.');
assert.equal(differenceWarning(registered), 'Name differs from the registry: check this Student ID.');
assert.equal(
  differenceWarning({ differences: ['name', 'id'], matchedBy: 'email' }),
  'Name and Student ID differ from the registry: check this email.',
);
assert.equal(differenceWarning(row({})), '');
assert.equal(
  registryMatchText({
    existing: { ...registered.existing!, id: '', programme: '', role: 'Office Staff/Admin', name: 'Puan Office' },
  }),
  'This email belongs to Puan Office, an Office Staff/Admin account.',
);
assert.equal(
  registryMatchText({ existing: { ...registered.existing!, role: 'Lecturer', name: 'Dr Lee' } }),
  'This email belongs to Dr Lee, a Lecturer account.',
);
assert.equal(repeatedText(repeated), 'Same Student ID as line 2, which is imported instead.');
assert.equal(
  repeatedText({ duplicateOf: 2, issue: 'same email as line 2' }),
  'Same email as line 2, which is imported instead.',
);
assert.equal(rowExplanation(badProgramme), '"X" is not an approved programme');
assert.equal(rowExplanation(row({})), '');

// the report lists every row with its outcome
assert.equal(importOutcome({ ...row({}), result: 'created' }), 'Created');
assert.equal(importOutcome({ ...row({}), result: 'created', invitationSent: false }), 'Created, activation email not sent');
assert.equal(importOutcome({ ...registered, result: 'skipped' }), 'Skipped: already registered');
assert.equal(importOutcome({ ...repeated, result: 'skipped' }), 'Skipped: repeated in this file');
assert.equal(importOutcome({ ...badProgramme, result: 'failed' }), 'Not imported');
const report = buildCsv([{ ...registered, result: 'skipped' as const }], IMPORT_REPORT_COLUMNS).split('\r\n');
assert.equal(report[0], 'Line,Student ID,Full name,Email,Programme,Outcome,Details');
assert.ok(report[1].includes('Skipped: already registered'));
assert.ok(report[1].includes('In the registry as Existing Student (WGA250001), Data Science.'));
assert.ok(report[1].includes('Name differs from the registry'));

// past batches, including ones recorded before names were kept
const batch: RegistryImportBatch = {
  id: 1,
  fileName: 'intake.xlsx',
  uploadedBy: 'Office',
  totalRows: 9,
  created: 3,
  skipped: 5,
  failed: 1,
  alreadyRegistered: 4,
  duplicateInFile: 1,
  invitationsFailed: 0,
  problems: [{ line: 3, id: 'WGA250001', result: 'skipped', issue: 'x', name: 'A', existingName: 'B' }],
  createdAt: '2026-10-12T10:00:00+08:00',
};
assert.equal(batchSummary(batch), '3 created · 4 already registered · 1 repeated · 1 not imported');
assert.equal(
  batchSummary({ ...batch, alreadyRegistered: undefined, duplicateInFile: undefined, skipped: 2, failed: 0 }),
  '3 created · 2 already registered',
);
assert.equal(
  buildCsv(batch.problems, BATCH_PROBLEM_COLUMNS).split('\r\n')[0],
  'Line,Student ID,Full name,Result,Reason,In the registry as',
);
assert.equal(buildCsv([{ line: 3, id: 'X', result: 'skipped', issue: 'y' }], BATCH_PROBLEM_COLUMNS).split('\r\n')[1], '3,X,,skipped,y,');

// matching the file's own columns
const fields: ImportField[] = [
  { key: 'student_id', label: 'Student ID', required: true },
  { key: 'full_name', label: 'Full name', required: true },
  { key: 'programme', label: 'Programme', required: true },
  { key: 'email', label: 'Email', required: true },
  { key: 'phone', label: 'Phone', required: false },
  { key: 'intake', label: 'Intake', required: false },
  { key: 'current_semester', label: 'Current semester', required: false },
];
const mapping: ImportMapping = {
  student_id: 1,
  full_name: 2,
  programme: 4,
  email: 5,
  phone: null,
  intake: null,
  current_semester: null,
};
assert.deepEqual(mappingProblems(mapping, fields), []);
assert.deepEqual(mappingProblems({ ...mapping, email: null, programme: null }, fields), [
  'Choose a column for: Programme, Email.',
]);
assert.deepEqual(mappingProblems({ ...mapping, phone: 2 }, fields), [
  'One column is chosen for both Full name and Phone.',
]);
const columns: ImportColumn[] = [
  { index: 0, letter: 'A', header: 'Bil', samples: ['1', '2'], suggestedField: null },
  { index: 1, letter: 'B', header: 'No. Matrik', samples: ['WQD1'], suggestedField: 'student_id' },
  { index: 2, letter: 'C', header: 'Nama', samples: ['Siti'], suggestedField: 'full_name' },
  { index: 3, letter: 'D', header: '', samples: ['990101-14-5678'], suggestedField: null },
  { index: 4, letter: 'E', header: 'Program', samples: [], suggestedField: 'programme' },
  { index: 5, letter: 'F', header: 'E-mel', samples: ['a@b.test'], suggestedField: 'email' },
  { index: 6, letter: 'G', header: '', samples: [], suggestedField: null },
];
assert.deepEqual(unusedColumns(columns, mapping), ['Bil', 'Column D']);
assert.equal(columnLabel(columns[3]), 'Column D');
assert.equal(columnLabel(columns[1]), 'No. Matrik');

// the screen uses all of this
const registry = readFileSync(resolve('src/components/StudentRegistry.tsx'), 'utf8');
assert.match(registry, /inspectStudentImport\(file\)/, 'a new file is described before its rows are checked');
assert.match(registry, /if \(layout\.layoutRecognised\)/, 'our own template skips the Match step');
assert.match(registry, /<RegistryImportMatch\b/, 'other layouts stop at Match columns');
assert.match(registry, /previewStudentImport\(reviewed, reviewedOptions\(\)\)/, 'edited rows are sent back in our own layout');
assert.match(registry, /commitStudentImport\(file, editedSet \? reviewedOptions\(\) : importOptions\(\)\)/);
assert.match(registry, /Change column matches/);
assert.match(registry, /<RegistryImportResult\b/, 'the import result must be shown, not only a toast');
assert.match(registry, /setImportFilter\('skipped'\)/, 'the skip notice must open the skipped rows');
assert.match(registry, /bulk: 'Bulk Import \(Excel or CSV\)'/);
assert.doesNotMatch(registry, /Bulk Import via CSV/);

console.log('Registry import listing tests passed.');
