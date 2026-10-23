import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { LETTER_WORDS, buildLetterHtml, malayLetterDate, renderLetterBodyHtml } from './letterDocument';
import { OPTIONAL_DETAIL_LABELS, RECIPIENT_PURPOSE_LABELS, chosenDetailLabels, recipientAddressLines } from './letterRecipients';

// the purposes and optional details are the server's
const recipients = readFileSync(resolve('../backend/letters/recipients.py'), 'utf8');
const block = (name: string) => recipients.match(new RegExp(`^${name} = \\[([\\s\\S]*?)^\\]`, 'm'))?.[1] ?? '';
const serverPurposes = Object.fromEntries([...block('PURPOSES').matchAll(/\("([A-Z]+)", "([^"]+)"/g)].map(([, code, label]) => [code, label]));
const serverDetails = Object.fromEntries([...block('OPTIONAL_DETAILS').matchAll(/\("([A-Z_]+)", "([^"]+)"/g)].map(([, code, label]) => [code, label]));
assert.ok(Object.keys(serverPurposes).length > 0, 'could not read PURPOSES from letters/recipients.py');
assert.deepEqual(RECIPIENT_PURPOSE_LABELS, serverPurposes);
assert.deepEqual(OPTIONAL_DETAIL_LABELS, serverDetails);

// the PDF's Malay words are the screen's
const pdf = readFileSync(resolve('../backend/letters/pdf_export.py'), 'utf8');
for (const language of ['en', 'ms'] as const) {
  const name = language === 'en' ? 'ENGLISH' : 'MALAY';
  const words = pdf.match(new RegExp(`^${name} = \\{([^\\n]*)\\}`, 'm'))?.[1] ?? '';
  assert.match(words, new RegExp(`"reference": "${LETTER_WORDS[language].reference}"`));
  assert.match(words, new RegExp(`"date": "${LETTER_WORDS[language].date}"`));
  assert.ok(words.includes(`"stamp": "${LETTER_WORDS[language].stamp}"`), `${name} stamp`);
}

// the address is printed under the name, postcode and city together
const details = { organisation: 'CIMB Bank Berhad', addressLine1: 'Jalan Universiti', addressLine2: '', postcode: '50603', city: 'Kuala Lumpur', state: '', include: ['MAX_PERIOD'] };
assert.deepEqual(recipientAddressLines(details), ['Jalan Universiti', '50603 Kuala Lumpur']);
assert.deepEqual(chosenDetailLabels(details), ['Maximum period of study']);
assert.deepEqual(recipientAddressLines(undefined), []);

// "| Label | value |" lines become a details table, other lines stay paragraphs
const table = renderLetterBodyHtml('Details:\n\n| Name | **Ali** |\n| Matric Number | S123 |\n\nThank you.');
assert.match(table, /^<p[^>]*>Details:<\/p><table/);
assert.equal((table.match(/<tr>/g) ?? []).length, 2);
assert.match(table, /<td[^>]*>Name<\/td><td[^>]*>:<\/td><td[^>]*><strong>Ali<\/strong><\/td>/);
assert.match(table, /<\/table><p[^>]*>Thank you.<\/p>$/);
assert.doesNotMatch(renderLetterBodyHtml('a | b'), /<table/);
assert.match(renderLetterBodyHtml('| Date | {{VALID_UNTIL}} |', { highlightPlaceholders: true }), /<td[^>]*><span[^>]*>\{\{VALID_UNTIL\}\}<\/span><\/td>/);

// dates on the Malay page
assert.equal(malayLetterDate('23 October 2026'), '23 Oktober 2026');
assert.equal(malayLetterDate('23 JANUARY 2027'), '23 JANUARI 2027');
assert.equal(malayLetterDate('{{CURRENT_DATE}}'), '{{CURRENT_DATE}}');

// a bilingual letter prints a second, Malay sheet; an English one prints one sheet
(globalThis as { window?: unknown }).window = { location: { origin: 'http://localhost:3000' } };
const base = { templateName: 'Student Confirmation Letter', refNo: 'UMF/PG/SCL/2026/0001', date: '23 October 2026', bodyParagraphs: 'Dear Sir/Madam,', studentName: 'Ali', matricNumber: 'S123' };
const english = buildLetterHtml(base);
assert.equal((english.match(/<div class="sheet">/g) ?? []).length, 1);
const both = buildLetterHtml({ ...base, bodyParagraphsMs: 'Tuan/Puan,' });
assert.equal((both.match(/<div class="sheet">/g) ?? []).length, 2);
assert.match(both, /Rujukan Kami: <span class="value">UMF\/PG\/SCL\/2026\/0001<\/span>/);
assert.match(both, /Tarikh: <span class="value">23 Oktober 2026<\/span>/);
assert.match(both, /Surat ini dikeluarkan atas permintaan pelajar/);

// the student form, the office review and the template editor use these
const student = readFileSync(resolve('src/components/StudentLetterGeneration.tsx'), 'utf8');
assert.match(student, /<LetterRecipientFields\b/);
assert.match(student, /requestLetter\(requesting\.id, note\.trim\(\), requesting\.asksRecipient \? details : undefined\)/);
const fields = readFileSync(resolve('src/components/LetterRecipientFields.tsx'), 'utf8');
assert.match(fields, /searchPlaceholder="Type to search"/, 'the long lists can be searched');
assert.match(fields, /Not in the list\? Type the name/);
const review = readFileSync(resolve('src/components/OfficeLetterRequests.tsx'), 'utf8');
assert.match(review, /malayBodyHtml=\{previewMsHtml \|\| undefined\}/);
const editor = readFileSync(resolve('src/components/LetterTemplateManagement.tsx'), 'utf8');
assert.match(editor, /Students say who it is for/);
assert.match(editor, /Valid for \(months\)/);

console.log('Confirmation letter tests passed.');
