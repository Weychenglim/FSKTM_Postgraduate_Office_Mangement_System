import assert from 'node:assert/strict';
import { describeProgramme, titleCase } from './programmeLabel';

assert.deepEqual(describeProgramme('MASTER OF DATA SCIENCE (COURSEWORK)'), {
  field: 'Data Science',
  detail: 'Master · Coursework',
});
assert.deepEqual(describeProgramme('Master of Computer Science (By Coursework)'), {
  field: 'Computer Science',
  detail: 'Master · Coursework',
});
assert.deepEqual(describeProgramme('MASTER OF ARTIFICIAL INTELLIGENCE (COURSEWORK)'), {
  field: 'Artificial Intelligence',
  detail: 'Master · Coursework',
});
assert.deepEqual(describeProgramme('Doctor of Philosophy'), { field: 'Doctor of Philosophy', detail: '' });
assert.deepEqual(describeProgramme('  '), { field: 'Not set', detail: '' });
assert.equal(titleCase('SCIENCE AND TECHNOLOGY'), 'Science and Technology');

console.log('Programme label tests passed.');
