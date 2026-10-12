import assert from 'node:assert/strict';
import { pageWindow } from './pageWindow';

assert.deepEqual(pageWindow(1, 1), [1]);
assert.deepEqual(pageWindow(1, 3), [1, 2, 3]);
assert.deepEqual(pageWindow(1, 9), [1, 2, null, 9]);
assert.deepEqual(pageWindow(5, 9), [1, null, 4, 5, 6, null, 9]);
assert.deepEqual(pageWindow(9, 9), [1, null, 8, 9]);
assert.deepEqual(pageWindow(2, 4), [1, 2, 3, 4]);
assert.ok(pageWindow(50, 400).length <= 7, 'the pager never grows with the page count');

console.log('page window tests passed');
