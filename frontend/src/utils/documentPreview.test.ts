import assert from 'node:assert/strict';
import { clampPage, MAX_ZIP_FILES, PreviewPageCache, toggleSelection, zipFileName } from './documentPreview';

assert.equal(clampPage(0, 3), 1);
assert.equal(clampPage(4, 3), 3);
assert.equal(clampPage(2.4, 3), 2);
assert.equal(clampPage(Number.NaN, 3), 1);
assert.equal(clampPage(2, 0), 1);

const cache = new PreviewPageCache(2);
cache.set('a', 'A');
cache.set('b', 'B');
assert.equal(cache.get('a'), 'A', 'Reading a page keeps it fresh');
cache.set('c', 'C');
assert.equal(cache.get('b'), undefined, 'The least recently seen page is dropped');
assert.equal(cache.get('a'), 'A');
assert.equal(cache.size, 2);

assert.equal(zipFileName(new Date('2026-10-14T01:05:00Z')), 'documents-20261014-0905.zip', 'Named in Malaysia time');

assert.deepEqual(toggleSelection([1, 2], 2), { selected: [1], full: false });
assert.deepEqual(toggleSelection([1], 2), { selected: [1, 2], full: false });
const full = Array.from({ length: MAX_ZIP_FILES }, (_, index) => index);
assert.deepEqual(toggleSelection(full, 999), { selected: full, full: true });

console.log('Preview paging, page cache, ZIP name and selection limit behave as expected');
