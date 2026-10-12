import assert from 'node:assert/strict';

import { firstEnabledIndex, lastEnabledIndex, nextEnabledIndex, typeaheadIndex } from './selectMenu';

const items = [
  { label: 'All statuses' },
  { label: 'Active' },
  { label: 'Deferred', disabled: true },
  { label: 'Data Science' },
  { label: 'Graduated' },
  { label: 'Withdrawn' },
];

// arrows skip disabled options and stop at the ends
assert.equal(nextEnabledIndex(items, 1, 1), 3);
assert.equal(nextEnabledIndex(items, 3, -1), 1);
assert.equal(nextEnabledIndex(items, 5, 1), 5);
assert.equal(nextEnabledIndex(items, 0, -1), 0);
assert.equal(nextEnabledIndex(items, -1, 1), 0);

// page keys move up to ten enabled options
assert.equal(nextEnabledIndex(items, 0, 10), 5);
assert.equal(nextEnabledIndex(items, 5, -10), 0);

assert.equal(firstEnabledIndex([{ label: 'A', disabled: true }, { label: 'B' }]), 1);
assert.equal(lastEnabledIndex([{ label: 'A' }, { label: 'B', disabled: true }]), 0);
assert.equal(firstEnabledIndex([]), -1);

// typing jumps to a matching label and skips disabled options
assert.equal(typeaheadIndex(items, 'g', -1), 4);
assert.equal(typeaheadIndex(items, 'd', -1), 3);
assert.equal(typeaheadIndex(items, 'data', 0), 3);
assert.equal(typeaheadIndex(items, 'x', 0), -1);
assert.equal(typeaheadIndex(items, '', 0), -1);

// repeating one letter cycles through the options that start with it
assert.equal(typeaheadIndex(items, 'a', -1), 0);
assert.equal(typeaheadIndex(items, 'aa', 0), 1);
assert.equal(typeaheadIndex(items, 'aaa', 1), 0);

console.log('Select menu keyboard tests passed.');
