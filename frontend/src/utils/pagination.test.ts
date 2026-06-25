import assert from 'node:assert/strict';
import { clampPage, paginate, paginationRange } from './pagination';

const values = Array.from({ length: 24 }, (_, index) => index + 1);

assert.deepEqual(paginate(values, 1, 10), values.slice(0, 10));
assert.deepEqual(paginate(values, 3, 10), values.slice(20, 24));
assert.equal(clampPage(4, 24, 10), 3);
assert.equal(clampPage(2, 0, 10), 1);
assert.deepEqual(paginationRange(2, 24, 10), {
  start: 11,
  end: 20,
  total: 24,
  totalPages: 3,
});

console.log('pagination utility tests passed');
