/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const configSource = readFileSync(resolve(process.cwd(), 'vite.config.ts'), 'utf8');

assert.match(
  configSource,
  /manualChunks/,
  'Vite build should define manualChunks so shared vendors do not bloat the app entry chunk.',
);

assert.doesNotMatch(
  configSource,
  /chunkSizeWarningLimit/,
  'Do not hide oversized bundle warnings by raising chunkSizeWarningLimit.',
);

console.log('bundle chunking tests passed');
