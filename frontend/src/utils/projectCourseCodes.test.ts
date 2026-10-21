import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseProjectCourseCodes, serializeProjectCourseCodes, validateProjectCourseCodes } from './projectCourseCodes';

test('Project entries retain legacy codes and serialize trimmed optional entries', () => {
  assert.deepEqual(parseProjectCourseCodes(' ABC1234, XYZ9000 '), ['ABC1234', 'XYZ9000']);
  assert.deepEqual(parseProjectCourseCodes(''), ['']);
  assert.equal(serializeProjectCourseCodes([' ABC1234 ', '', 'XYZ9000']), 'ABC1234, XYZ9000');
  assert.equal(validateProjectCourseCodes(['', ' ']), null);
});

test('Duplicate entries, pasted comma lists and oversized combined values are rejected', () => {
  assert.match(validateProjectCourseCodes(['ABC1234', ' abc1234 '])!, /already|duplicate/i);
  assert.match(validateProjectCourseCodes(['ABC1234, XYZ9000'])!, /one.*entry/i);
  assert.equal(validateProjectCourseCodes(['A'.repeat(255)]), null);
  assert.match(validateProjectCourseCodes(['A'.repeat(254), 'B'])!, /255/);
});
