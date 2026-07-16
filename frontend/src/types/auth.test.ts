import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const authSource = await readFile(new URL('./auth.ts', import.meta.url), 'utf8');

assert.match(authSource, /export interface DemoUser/u);
assert.doesNotMatch(authSource, /export const .*CREDENTIAL/iu);
assert.doesNotMatch(authSource, /\bpass(?:word)?\s*:/iu);

console.log('authentication source isolation tests passed');
