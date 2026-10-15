import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  APPOINTMENT_PLACEHOLDERS,
  LETTER_PLACEHOLDERS,
  fieldNameFromLabel,
  fieldNameProblem,
  fillLetterTags,
  findPlaceholderProblems,
  renderLetterBodyHtml,
} from './letterDocument';

// the frontend list is exactly the server's registry
const registry = readFileSync(resolve('../backend/letters/placeholders.py'), 'utf8');
const serverEntries = [...registry.matchAll(/^\s+"([A-Z_]+)": \("([^"]+)",/gm)].map(
  ([, name, label]) => ({ tag: `{{${name}}}`, label }),
);
assert.ok(serverEntries.length > 0, 'could not read letters/placeholders.py');
assert.deepEqual(
  [...LETTER_PLACEHOLDERS, ...APPOINTMENT_PLACEHOLDERS].map((p) => ({ tag: p.tag, label: p.label })),
  serverEntries,
  'LETTER_PLACEHOLDERS and APPOINTMENT_PLACEHOLDERS must match letters/placeholders.py',
);

// each appointment tag works in the same letter kinds as on the server
const purposeBlock = registry.match(/^APPOINTMENT_PURPOSES = \{([\s\S]*?)^\}/m)?.[1] ?? '';
const purposeNames: Record<string, string[]> = {
  _BOTH: ['SUPERVISOR_APPOINTMENT', 'PANEL_APPOINTMENT'],
  '(SUPERVISOR_LETTER,)': ['SUPERVISOR_APPOINTMENT'],
  '(PANEL_LETTER,)': ['PANEL_APPOINTMENT'],
};
const serverPurposes = [...purposeBlock.matchAll(/^\s+"([A-Z_]+)": ([^\n]+),$/gm)].map(([, name, value]) => ({
  tag: `{{${name}}}`,
  purposes: purposeNames[value.trim()],
}));
assert.deepEqual(
  APPOINTMENT_PLACEHOLDERS.map((p) => ({ tag: p.tag, purposes: [...p.purposes] })),
  serverPurposes,
  'APPOINTMENT_PLACEHOLDERS purposes must match letters/placeholders.py',
);
assert.match(fieldNameProblem('PANEL_NAME', []) ?? '', /built-in/);

// the editor check agrees with the server's rules
assert.deepEqual(findPlaceholderProblems('Dear {{STUDENT_NAME}}, ref {{REFERENCE_NUMBER}}'), { unknown: [], malformed: [] });
assert.deepEqual(findPlaceholderProblems('Hi {{STUDNET_NAME}} {{STUDNET_NAME}}'), { unknown: ['{{STUDNET_NAME}}'], malformed: [] });
assert.deepEqual(findPlaceholderProblems('Hi {{STUDENT_NAME}'), { unknown: [], malformed: ['{{STUDENT_NAME'] });
assert.deepEqual(findPlaceholderProblems('Hi {STUDENT_NAME}}'), { unknown: [], malformed: ['STUDENT_NAME}}'] });
assert.deepEqual(findPlaceholderProblems('Hi {{ student }}'), { unknown: [], malformed: ['{{ student }}'] });
assert.deepEqual(findPlaceholderProblems('plain {text} ok'), { unknown: [], malformed: [] });
assert.deepEqual(findPlaceholderProblems('Dear {STUDENT_NAME}, welcome'), { unknown: [], malformed: ['{STUDENT_NAME}'] });
assert.deepEqual(findPlaceholderProblems('Dear {{{STUDENT_NAME}}}'), { unknown: [], malformed: ['{{{STUDENT_NAME}}}'] });

// a template's own office-filled fields are known tags for that template only
assert.deepEqual(findPlaceholderProblems('Attendance {{ATTENDANCE}}'), { unknown: ['{{ATTENDANCE}}'], malformed: [] });
assert.deepEqual(findPlaceholderProblems('Attendance {{ATTENDANCE}}', ['ATTENDANCE']), { unknown: [], malformed: [] });

// office-filled field names follow the server's rules
assert.equal(fieldNameFromLabel('Attendance (%)', []), 'ATTENDANCE');
assert.equal(fieldNameFromLabel('Attendance (%)', ['ATTENDANCE']), 'ATTENDANCE_B');
assert.equal(fieldNameFromLabel('Semester 2 attendance', []), 'SEMESTER_ATTENDANCE');
assert.equal(fieldNameFromLabel('Student name', []), 'STUDENT_NAME_B', 'never a built-in name');
assert.equal(fieldNameFromLabel('%', []), 'FIELD');
assert.equal(fieldNameProblem('ATTENDANCE', []), null);
assert.match(fieldNameProblem('STUDENT_NAME', []) ?? '', /built-in/);
assert.match(fieldNameProblem('ATTENDANCE', ['ATTENDANCE']) ?? '', /already one of this template/);
assert.match(fieldNameProblem('ATTEND1', []) ?? '', /capital letters/);
assert.match(fieldNameProblem('A', []) ?? '', /capital letters/);

// the office preview fills what it has and keeps the rest visible
assert.equal(
  fillLetterTags('{{STUDENT_NAME}} attended {{ATTENDANCE}} on {{CURRENT_DATE}}', { STUDENT_NAME: 'Ali', ATTENDANCE: '  ' }),
  'Ali attended {{ATTENDANCE}} on {{CURRENT_DATE}}',
);
const preview = renderLetterBodyHtml('{{ATTENDANCE}} {{STUDENT_NAME}} {{OOPS}}', {
  highlightPlaceholders: true,
  officeFields: ['ATTENDANCE'],
});
assert.match(preview, /title="Filled in by the office when approving"[^>]*>\{\{ATTENDANCE\}\}/);
assert.match(preview, /title="Unknown placeholder"[^>]*>\{\{OOPS\}\}/);

// the editor runs a real check, including the template's own fields
const editor = readFileSync(resolve('src/components/LetterTemplateManagement.tsx'), 'utf8');
assert.doesNotMatch(editor, /visual layout assertion check/);
assert.match(editor, /findPlaceholderProblems\(editorContent, editorFields\.map/);
assert.match(editor, /getLetterPlaceholders\(\)/);
assert.match(editor, /<option value="Archived">/);
assert.match(editor, /<OfficeFieldsEditor\b/);
assert.match(editor, /customFields: editorFields/);

console.log('Letter placeholder parity tests passed.');
