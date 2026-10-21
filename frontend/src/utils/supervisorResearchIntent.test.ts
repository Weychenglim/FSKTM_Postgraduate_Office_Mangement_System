import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildSupervisorApplicationFormData } from './supervisorDocuments';

const intent = await import('./supervisorResearchIntent').catch(() => assert.fail('Research Intent validation and draft contracts must exist'));

test('all nine plain text fields are required and strictly bounded, with no invented text', () => {
  const blank = intent.emptySupervisorResearchIntent();
  assert.equal(blank.version, 1);
  assert.equal(intent.RESEARCH_INTENT_FIELDS.length, 9);
  for (const field of intent.RESEARCH_INTENT_FIELDS) assert.equal(blank[field.key], '');
  assert.match(intent.validateSupervisorResearchIntent(blank)?.message ?? '', /Introduction/);
  const complete = Object.fromEntries(Object.entries(blank).map(([key, value]) => [key, key === 'version' ? value : `  Actual ${key}\nResearch text  `]));
  assert.equal(intent.validateSupervisorResearchIntent(complete), null);
  const clean = intent.cleanSupervisorResearchIntent(complete as ReturnType<typeof intent.emptySupervisorResearchIntent>);
  assert.equal(clean.introduction, 'Actual introduction\nResearch text');
  assert.ok(intent.validateSupervisorResearchIntent({ ...complete, version: 2 }));
  assert.ok(intent.validateSupervisorResearchIntent({ ...complete, extra: 'unknown' }));
  assert.ok(intent.validateSupervisorResearchIntent({ ...complete, aim: 7 }));
  assert.ok(intent.validateSupervisorResearchIntent({ ...complete, aim: ' '.repeat(10) }));
  assert.ok(intent.validateSupervisorResearchIntent({ ...complete, aim: 'x'.repeat(10001) }));
  assert.equal(intent.validateSupervisorResearchIntent({ ...complete, aim: 'x'.repeat(10000) }), null);
});

test('multipart carries the complete versioned research intent separately from shared research fields', () => {
  const researchIntent = { ...intent.emptySupervisorResearchIntent(), introduction: 'Student supplied introduction' };
  const body = buildSupervisorApplicationFormData({ proposedSupervisorId: 'SV1', researchTitle: 'Shared title', researchArea: 'Shared area', researchAbstract: 'Shared short abstract', researchIntent }, new Map());
  assert.deepEqual(JSON.parse(String(body.get('researchIntent'))), researchIntent);
  assert.equal(body.get('researchTitle'), 'Shared title');
});

test('saved draft comparisons ignore JSON property order while detecting exact text changes', () => {
  assert.equal(typeof intent.supervisorApplicationDraftFingerprint, 'function');
  const draft = { version: 1 as const, step: 2 as const, researchTitle: 'Keep spaces  ', projectCodeEntries: ['WQD7002'], researchArea: '', researchAbstract: '', titleOrigin: '' as const, courseResults: [{ courseName: 'Methods', courseCode: '', semesterSession: '', grade: '' }], noCoursesTaken: false, proposedSupervisorId: null, researchIntent: intent.emptySupervisorResearchIntent() };
  // PostgreSQL JSONB can return object keys in a different order than the original PUT.
  const reordered = Object.fromEntries(Object.entries(draft).reverse()) as typeof draft;
  reordered.researchIntent = Object.fromEntries(Object.entries(draft.researchIntent).reverse()) as typeof draft.researchIntent;
  reordered.courseResults = draft.courseResults.map(row => Object.fromEntries(Object.entries(row).reverse()) as typeof row);
  assert.equal(intent.supervisorApplicationDraftFingerprint(draft), intent.supervisorApplicationDraftFingerprint(reordered));
  assert.notEqual(intent.supervisorApplicationDraftFingerprint(draft), intent.supervisorApplicationDraftFingerprint({ ...draft, researchTitle: draft.researchTitle.trim() }));
});
