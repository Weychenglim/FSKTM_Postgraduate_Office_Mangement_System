import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  A4_PAGE,
  FIRST_PAGE_CAPACITY,
  LATER_PAGE_CAPACITY,
  paginateBlocks,
  splitLetterBlocks,
} from './letterPages';

// one A4 sheet at 96 pixels per inch
assert.equal(Math.round((A4_PAGE.width / 96) * 25.4), 210);
assert.equal(Math.round((A4_PAGE.height / 96) * 25.4), 297);
assert.ok(LATER_PAGE_CAPACITY < FIRST_PAGE_CAPACITY, 'later pages keep room for the continued line');

// a short letter is one page
assert.deepEqual(paginateBlocks([100, 200, 300], 1000, 900), [[0, 1, 2]]);
// blocks move to the next page whole, and later pages use their own capacity
assert.deepEqual(paginateBlocks([600, 300, 200, 500, 450], 1000, 900), [[0, 1], [2, 3], [4]]);
// a block taller than a page still gets a page, and nothing is lost
assert.deepEqual(paginateBlocks([1500, 100], 1000, 900), [[0], [1]]);
assert.deepEqual(paginateBlocks([], 1000, 900), [[]]);

// without a browser document the HTML stays one block
assert.deepEqual(splitLetterBlocks(''), []);
assert.deepEqual(splitLetterBlocks('<p>a</p><p>b</p>'), ['<p>a</p><p>b</p>']);

// issued letters (office and student View) and the office review use the A4 pages;
// the student's request screen shows no letter at all
const issued = readFileSync(resolve('src/components/IssuedLetters.tsx'), 'utf8');
const review = readFileSync(resolve('src/components/OfficeLetterRequests.tsx'), 'utf8');
const student = readFileSync(resolve('src/components/StudentLetterGeneration.tsx'), 'utf8');
assert.match(issued, /<LetterPages\b/);
assert.match(review, /<LetterPages\b/);
assert.doesNotMatch(student, /<LetterPages\b/);

console.log('Letter page tests passed.');
