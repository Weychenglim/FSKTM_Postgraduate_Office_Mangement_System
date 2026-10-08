import assert from 'node:assert/strict';
import * as correction from './submittedMarksCorrection';

const components = [{id: '1', name: 'Problem', maxMarks: '40.00', marksAwarded: '30.00'}, {id: '2', name: 'Method', maxMarks: '60.00', marksAwarded: '50.00'}];
const original = {comments: 'Original', components};
assert.equal(correction.validateSubmittedMarksCorrection(original, {'1':'35', '2':'50'}, 'Original', 'Reason'), null);
assert.equal(correction.validateSubmittedMarksCorrection(original, {'1':'30', '2':'50'}, 'New', 'Reason'), null);
assert.match(correction.validateSubmittedMarksCorrection(original, {'1':'35', '2':'50'}, 'Original', '   ')!, /reason/i);
assert.match(correction.validateSubmittedMarksCorrection(original, {'1':'30.00', '2':'50'}, 'Original', 'Reason')!, /change/i);
for (const value of ['-1', '41', 'NaN', 'Infinity', '1.001', '']) {
  assert.ok(correction.validateSubmittedMarksCorrection(original, {'1':value, '2':'50'}, 'Original', 'Reason'), value);
}
console.log('Submitted Marks reason, bounds, decimal precision and no-change validation passed');
