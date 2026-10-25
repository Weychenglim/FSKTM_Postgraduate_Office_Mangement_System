import React from 'react';
import test from 'node:test';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {CapacityPolicySummary} from './CapacityPolicySummary';
import type {SemesterCapacityPlan} from '../types';

const plan = (version: number, lifecycleStatus: SemesterCapacityPlan['lifecycleStatus']) => ({version,lifecycleStatus} as SemesterCapacityPlan);
const render = (published: SemesterCapacityPlan | null, drafts: SemesterCapacityPlan[], mutable = true) => renderToStaticMarkup(<CapacityPolicySummary published={published} drafts={drafts} mutable={mutable} disabled={false} onVersions={()=>{}} onContinue={()=>{}} onPrepare={()=>{}} />);

test('published policy is separated from an older draft', () => {
  const html = render(plan(5,'PUBLISHED'), [plan(4,'DRAFT')]);
  assert.match(html,/capacity-policy-published[\s\S]*Version 5[\s\S]*capacity-policy-draft[\s\S]*Version 4/);
  assert.match(html,/Continue editing/);
  assert.doesNotMatch(html,/Prepare limits|Planning baseline|students per lecturer/);
});
test('published policy without a draft offers a revision', () => {
  assert.match(render(plan(5,'PUBLISHED'),[]),/Prepare revision/);
});
test('unpublished setup offers the existing draft or initial preparation', () => {
  assert.match(render(null,[plan(1,'DRAFT')]),/No published limits[\s\S]*Continue editing/);
  assert.match(render(null,[]),/No published limits[\s\S]*Prepare limits/);
});
test('multiple drafts require explicit selection', () => {
  const html = render(plan(5,'PUBLISHED'),[plan(4,'DRAFT'),plan(3,'DRAFT')]);
  assert.match(html,/Review drafts · 2/);
  assert.doesNotMatch(html,/Continue editing/);
});
test('closed semester retains read-only draft access', () => {
  const html = render(plan(5,'PUBLISHED'),[plan(4,'DRAFT')],false);
  assert.match(html,/View drafts/);
  assert.doesNotMatch(html,/Continue editing|Prepare revision|Prepare limits/);
});
