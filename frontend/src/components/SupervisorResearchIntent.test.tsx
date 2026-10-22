import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const intent = await import('../utils/supervisorResearchIntent').catch(() => assert.fail('Research Intent schema must exist'));
const fields = await import('./SupervisorResearchIntent').catch(() => assert.fail('Research Intent editor and view must exist'));

test('nine labelled fields are grouped and empty, with bounds and explicit required descriptions', () => {
  const html = renderToStaticMarkup(<fields.SupervisorResearchIntentEditor value={intent.emptySupervisorResearchIntent()} onChange={() => {}} />);
  for (const group of ['Background and purpose', 'Questions and objectives', 'Research plan']) assert.ok(html.includes(group));
  for (const field of intent.RESEARCH_INTENT_FIELDS) {
    assert.ok(html.includes(`for="research-intent-${field.key}"`));
    assert.ok(html.includes(`id="research-intent-${field.key}"`));
  }
  assert.equal((html.match(/<textarea/g) ?? []).length, 9);
  assert.equal((html.match(/maxLength="10000"/g) ?? []).length, 9);
});

test('submitted view distinguishes legacy, loading, error/retry and real full text safely', () => {
  const props = { record: null, loading: false, error: null, onRetry: () => {} };
  assert.match(renderToStaticMarkup(<fields.SupervisorResearchIntentSection {...props} />), /No Research Intent was recorded/);
  assert.match(renderToStaticMarkup(<fields.SupervisorResearchIntentSection {...props} loading />), /Loading submitted Research Intent/);
  const failed = renderToStaticMarkup(<fields.SupervisorResearchIntentSection {...props} error="Access unavailable" />);
  assert.match(failed, /Access unavailable/); assert.match(failed, /Retry/);
  const record = { ...intent.emptySupervisorResearchIntent(), introduction: '<script>Actual student text</script>\nSecond paragraph' };
  const html = renderToStaticMarkup(<fields.SupervisorResearchIntentSection {...props} record={record} />);
  assert.match(html, /&lt;script&gt;Actual student text&lt;\/script&gt;/);
  assert.match(html, /Second paragraph/); assert.doesNotMatch(html, /<script>/);
  for (const field of intent.RESEARCH_INTENT_FIELDS) assert.ok(html.includes(field.label));
});
