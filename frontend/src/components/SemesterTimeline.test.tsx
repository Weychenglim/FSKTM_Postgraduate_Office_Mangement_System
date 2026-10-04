import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SemesterTimeline } from './SemesterTimeline';
import type { ActiveSemesterTimeline } from '../types';

const draft: ActiveSemesterTimeline = {
  available: true, semesterId: 3, semester: 'Semester II', session: '2099/2100',
  levels: [{ level: 'P1', entries: [{
    id: 2, level: 'P1', step: 1, title: 'Selected Draft Milestone', detail: '', action: 'Student',
    deadlineStart: '2027-02-05', deadlineEnd: '2027-02-07', weekLabel: '',
    targetRoles: ['STUDENT'], status: 'Upcoming', displayOrder: 1,
  }] }],
};
const render = (timeline: ActiveSemesterTimeline | null, loading = false, error: string | null = null) =>
  renderToStaticMarkup(<SemesterTimeline timeline={timeline} loading={loading} error={error} onRetry={() => {}} />);

const selected = render(draft);
assert.match(selected, /Semester II.*2099\/2100/);
assert.match(selected, /Selected Draft Milestone/);
assert.doesNotMatch(selected, /Loading semester master schedule/);
assert.doesNotMatch(selected, /Manage the active semester/);
const loading = render(draft, true);
assert.match(loading, /Loading semester master schedule/);
assert.doesNotMatch(loading, /Selected Draft Milestone|Semester II/);
const failed = render(draft, false, 'Selected semester failed to load');
assert.match(failed, /Selected semester failed to load/);
assert.doesNotMatch(failed, /Selected Draft Milestone|Semester II/);
assert.match(render(null), /No timeline/);
console.log('selected-semester Timeline rendering and stale-content safeguards passed');
