import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  LETTER_PLACEHOLDERS,
  findPlaceholderProblems,
  substitutePlaceholders,
  type PlaceholderValues,
} from './letterDocument';

// ── the frontend list is exactly the server's registry ───────────────────────
const registry = readFileSync(resolve('../backend/letters/placeholders.py'), 'utf8');
const serverEntries = [...registry.matchAll(/^\s+"([A-Z_]+)": \("([^"]+)",/gm)].map(
  ([, name, label]) => ({ tag: `{{${name}}}`, label }),
);
assert.ok(serverEntries.length > 0, 'could not read letters/placeholders.py');
assert.deepEqual(
  LETTER_PLACEHOLDERS.map((p) => ({ tag: p.tag, label: p.label })),
  serverEntries,
  'LETTER_PLACEHOLDERS must match letters/placeholders.py',
);

// ── every supported tag is filled when a letter is generated ─────────────────
const values: PlaceholderValues = {
  studentName: 'v', matricNumber: 'v', programName: 'v', currentStatus: 'v', supervisorName: 'v',
  referenceNumber: 'v', date: 'v', passportNumber: 'v', country: 'v', programmeMode: 'v',
  fieldOfResearch: 'v', modeOfStudy: 'v', initialSemester: 'v', currentSemester: 'v',
  maxSemester: 'v', expectedCompletion: 'v',
};
const filled = substitutePlaceholders(serverEntries.map((e) => e.tag).join(' '), values);
assert.doesNotMatch(filled, /\{\{/, `unfilled placeholder left in: ${filled}`);

// ── the editor check agrees with the server's rules ──────────────────────────
assert.deepEqual(findPlaceholderProblems('Dear {{STUDENT_NAME}}, ref {{REFERENCE_NUMBER}}'), { unknown: [], malformed: [] });
assert.deepEqual(findPlaceholderProblems('Hi {{STUDNET_NAME}} {{STUDNET_NAME}}'), { unknown: ['{{STUDNET_NAME}}'], malformed: [] });
assert.deepEqual(findPlaceholderProblems('Hi {{STUDENT_NAME}'), { unknown: [], malformed: ['{{STUDENT_NAME'] });
assert.deepEqual(findPlaceholderProblems('Hi {STUDENT_NAME}}'), { unknown: [], malformed: ['STUDENT_NAME}}'] });
assert.deepEqual(findPlaceholderProblems('Hi {{ student }}'), { unknown: [], malformed: ['{{ student }}'] });
assert.deepEqual(findPlaceholderProblems('plain {text} ok'), { unknown: [], malformed: [] });

// ── the editor runs a real check instead of a canned success message ─────────
const editor = readFileSync(resolve('src/components/LetterTemplateManagement.tsx'), 'utf8');
assert.doesNotMatch(editor, /visual layout assertion check/);
assert.match(editor, /findPlaceholderProblems\(editorContent\)/);
assert.match(editor, /getLetterPlaceholders\(\)/);
assert.match(editor, /<option value="Archived">/);

console.log('Letter placeholder parity tests passed.');
