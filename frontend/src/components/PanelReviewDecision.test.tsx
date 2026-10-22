import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PanelRecommendationReviewDrawer } from './LecturerPanelAppointments';
import type { PanelRecommendationDraft } from '../types';
const recommendation: PanelRecommendationDraft = { id: 7, studentId: 'PG001', studentName: 'Student', programme: 'Programme', proposedTopic: 'Research', recommendedMember: 'Dr Panel', recommendedMemberId: 'P001', submittedDate: '12 Oct 2026', status: 'SUBMITTED_TO_PANEL' };
const render = (extra = {}) => renderToStaticMarkup(<PanelRecommendationReviewDrawer isOpen onClose={() => {}} recommendation={recommendation} reviewerRole="SELECTED_PANEL" {...extra} />);
assert.doesNotMatch(render(), /<textarea|REASON FOR REJECTION/, 'No rejection draft before choosing Reject');
assert.match(render(), /Accept Panel Nomination/);
assert.match(render(), /Reject Panel Nomination/);
assert.doesNotMatch(render({ readOnly: true }), /Reject Panel Nomination|Accept Panel Nomination|<textarea/);
assert.equal((render({ busy: true }).match(/disabled=""/g) ?? []).length >= 3, true, 'Busy decision and return actions are disabled');
console.log('Panel review starts with neutral choices and respects read-only and busy state');

assert.match(render({onOpenStudent:()=>{}}),/View student record/,'Authorised student navigation remains inside Panel request details');
assert.doesNotMatch(render(),/View student record/,'No student action is shown without the host navigation capability');
