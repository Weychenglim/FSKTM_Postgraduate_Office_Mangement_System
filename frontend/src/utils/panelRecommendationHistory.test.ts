import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { SubmittedRecommendation } from '../types';

const lecturerPage = readFileSync(new URL('../components/LecturerPanelAppointments.tsx', import.meta.url), 'utf8');
assert.doesNotMatch(lecturerPage, /recommendation\.date,\s*recommendation\.status/,
  'Distinct same-day cancelled attempts must not be collapsed by their display date and status.');
const { mergeSubmittedPanelHistory } = await import('./panelRecommendationWorkflow');
const row = (id: number, reason: string): SubmittedRecommendation => ({
  id: `REC-${String(id).padStart(4,'0')}`, recommendationId: id, studentName: 'Synthetic Student', studentId: 'SYN-001',
  researchTitle: 'Synthetic Research', recommendedPanel: 'Same Selected Panel', date: '07 Oct 2026', status: 'Cancelled',
  cancellationReason: reason, semester: 'Semester I 2026/2027',
});
const first = row(2, 'Cancelled by the submitting supervisor.');
const second = row(3, 'Automatically cancelled because the Supervisor was replaced.');
assert.deepEqual(mergeSubmittedPanelHistory([second,first], [second,first]), [second,first],
  'Keep both attempts, deduplicating only repeated copies of the same persisted record.');
const sameRecord = { ...first, recommendationId: '2' };
assert.deepEqual(mergeSubmittedPanelHistory([first], [sameRecord]), [first]);
assert.deepEqual(mergeSubmittedPanelHistory([], [first,second]), [first,second]);
const legacyOne = { ...first, recommendationId: undefined };
const legacyTwo = { ...second, recommendationId: undefined };
assert.deepEqual(mergeSubmittedPanelHistory([legacyOne,legacyTwo], [legacyOne]), [legacyOne,legacyTwo],
  'Fallback display IDs retain distinct records rather than collapsing their visible fields.');
assert.match(lecturerPage, /mergeSubmittedPanelHistory\(customList, panelRecommendations\)/);
console.log('Distinct Panel history attempts and duplicate record copies passed');
