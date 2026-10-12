import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { GeneratedLetter } from '../types';
import { ApiError } from '../services/apiClient';
import { getIssuedLetters, missingFieldsFrom } from '../services/lettersApi';
import { SIDEBAR_ITEMS } from '../constants/navigation';
import { APP_ROUTES, isKnownAppPath, routeForNotificationTarget, sidebarItemForPath } from '../constants/routes';
import {
  LETTERHEAD,
  PENDING_REFERENCE,
  letterDataFromIssued,
  letterFileName,
  missingPlaceholderLabels,
  openLetterWindow,
  printLetterInWindow,
  type PlaceholderValues,
} from './letterDocument';

// missing record fields are named in order of first use, once each
const values: PlaceholderValues = {
  studentName: 'Ali bin Abu',
  matricNumber: 'S2101234',
  programName: 'Master of Computer Science',
  currentStatus: 'Active',
  referenceNumber: '',
  date: '',
  passportNumber: '  ',
};
assert.deepEqual(
  missingPlaceholderLabels(
    'To {{STUDENT_NAME}} ({{COUNTRY}}), passport {{PASSPORT_NUMBER}}, again {{COUNTRY}}. Ref {{REFERENCE_NUMBER}} {{CURRENT_DATE}} {{UNKNOWN_TAG}}',
    values,
  ),
  ['Country', 'Passport No.'],
);
assert.deepEqual(missingPlaceholderLabels('Dear {{STUDENT_NAME}} of {{PROGRAMME_NAME}}', values), []);

// a saved letter prints with the server's reference number and date
const issued: GeneratedLetter = {
  id: '7',
  referenceNumber: 'UMF/PG/ENR/2026/0007',
  templateId: '3',
  templateName: 'Confirmation of Study',
  letterType: 'Academic Certification',
  status: 'Issued',
  date: '11 October 2026',
  issuedAt: '2026-10-11T10:30:00+08:00',
  studentName: 'Ali bin Abu',
  matricNumber: 'S2101234',
  programName: 'Master of Computer Science',
  revokedAt: null,
  revokeReason: '',
  content: 'This is to confirm that **Ali bin Abu** is registered.',
};
assert.deepEqual(letterDataFromIssued(issued), {
  templateName: 'Confirmation of Study',
  refNo: 'UMF/PG/ENR/2026/0007',
  date: '11 October 2026',
  bodyParagraphs: 'This is to confirm that **Ali bin Abu** is registered.',
  studentName: 'Ali bin Abu',
  matricNumber: 'S2101234',
});
assert.equal(letterFileName(letterDataFromIssued(issued)), 'UM_Confirmation_of_Study_S2101234');

// the reference number now comes only from the server
const documentSource = readFileSync(resolve('src/utils/letterDocument.ts'), 'utf8');
const studentScreen = readFileSync(resolve('src/components/StudentLetterGeneration.tsx'), 'utf8');
assert.doesNotMatch(documentSource, /generateReferenceNumber|Math\.random/);
assert.doesNotMatch(studentScreen, /generateReferenceNumber/);
assert.match(studentScreen, /generateLetter\(selectedTemplate\.id\)/);
assert.match(studentScreen, /PENDING_REFERENCE/);
assert.equal(PENDING_REFERENCE, 'Assigned when generated');

// the server's missing-field list is read from a 400 only
assert.deepEqual(
  missingFieldsFrom(new ApiError('Missing', 400, { detail: 'Missing', missingFields: ['Passport No.', 'Country'] })),
  ['Passport No.', 'Country'],
);
assert.equal(missingFieldsFrom(new ApiError('Bad', 400, { templateId: 'Choose a letter template.' })), null);
assert.equal(missingFieldsFrom(new ApiError('Forbidden', 403, { missingFields: ['Country'] })), null);
assert.equal(missingFieldsFrom(new Error('offline')), null);

// the print window is opened first and filled when the letter arrives
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
let written = '';
const listeners = new Map<string, EventListenerOrEventListenerObject>();
let printed = false;
const popup = {
  document: { open() {}, write(value: string) { written = value; }, close() {} },
  addEventListener(type: string, listener: EventListenerOrEventListenerObject) { listeners.set(type, listener); },
  focus() {},
  print() { printed = true; },
  close() {},
};
let blocked = false;
Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: { location: { origin: 'https://portal.example.test' }, open: () => (blocked ? null : popup) },
});
try {
  const win = openLetterWindow();
  assert.equal(win, popup);
  assert.equal(written, '');
  printLetterInWindow(win as unknown as Window, letterDataFromIssued(issued));
  assert.match(written, /UMF\/PG\/ENR\/2026\/0007/);
  assert.match(written, /<strong>Ali bin Abu<\/strong>/);
  assert.doesNotMatch(written, /<script\b/i);
  (listeners.get('load') as EventListener)(new Event('load'));
  assert.equal(printed, true);
  blocked = true;
  assert.equal(openLetterWindow(), null);
} finally {
  if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
  else Reflect.deleteProperty(globalThis, 'window');
}

// the office register sends only the filters that are set
const originalFetch = globalThis.fetch;
const requested: string[] = [];
globalThis.fetch = (async (input: RequestInfo | URL) => {
  requested.push(String(input));
  return new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } });
}) as typeof fetch;
try {
  await getIssuedLetters({ search: ' S2101234 ', from: '2026-01-01', to: '', status: '' });
  await getIssuedLetters();
} finally {
  globalThis.fetch = originalFetch;
}
assert.deepEqual(requested, [
  '/api/letters/requests/?search=S2101234&from=2026-01-01',
  '/api/letters/requests/',
]);

// letter notifications open My Letters, and both letter tabs are real routes
assert.equal(
  routeForNotificationTarget({ targetModule: 'LETTERS', recordType: 'GENERATED_LETTER', recordId: '7' }),
  APP_ROUTES.lettersMine,
);
for (const path of [APP_ROUTES.lettersMine, APP_ROUTES.lettersIssued]) {
  assert.equal(isKnownAppPath(path), true, path);
  assert.equal(sidebarItemForPath(path), SIDEBAR_ITEMS.LETTER_GENERATION, path);
}

// the Word copy carries the same letterhead as the printed letter
const docxSource = readFileSync(resolve('../backend/letters/docx_export.py'), 'utf8');
const pythonStrings = (name: string) => {
  const match = docxSource.match(new RegExp(`^${name} = (\\([\\s\\S]*?^\\)|"[^"\\n]*")`, 'm'));
  assert.ok(match, `could not read ${name} from letters/docx_export.py`);
  return [...match[1].matchAll(/"([^"\n]*)"/g)].map(([, text]) => text);
};
assert.equal(pythonStrings('FACULTY').join(''), LETTERHEAD.faculty);
assert.deepEqual(pythonStrings('ADDRESS_LINES'), [...LETTERHEAD.addressLines]);
assert.equal(pythonStrings('DISCLAIMER').join(''), LETTERHEAD.disclaimer);
assert.equal(pythonStrings('SIGNATORY_NAME').join(''), LETTERHEAD.signatoryName);
assert.equal(pythonStrings('SIGNATORY_OFFICE').join(''), LETTERHEAD.signatoryOffice);

console.log('Issued letter tests passed.');
