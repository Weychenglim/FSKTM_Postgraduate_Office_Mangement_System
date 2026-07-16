import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { build, loadEnv } from 'vite';

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const canaries = {
  VITE_DEMO_ADMIN_PASSWORD: 'PRODUCTION-CANARY-ADMIN-8e32',
  VITE_DEMO_COORDINATOR_PASSWORD: 'PRODUCTION-CANARY-COORD-4f91',
  VITE_DEMO_LECTURER_PASSWORD: 'PRODUCTION-CANARY-LECT-7a26',
  VITE_DEMO_STUDENT_PASSWORD: 'PRODUCTION-CANARY-STUDENT-3d85',
};

async function collectBundleText(directory: string): Promise<string> {
  const entries = await readdir(directory, { withFileTypes: true });
  const contents: string[] = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      contents.push(await collectBundleText(entryPath));
    } else if (/\.(?:html|js)$/u.test(entry.name)) {
      contents.push(await readFile(entryPath, 'utf8'));
    }
  }

  return contents.join('\n');
}

const outputDirectory = await mkdtemp(path.join(tmpdir(), 'fsktm-production-security-'));
const previousEnvironment = Object.fromEntries(
  ['VITE_ENABLE_DEMO_LOGIN', ...Object.keys(canaries)].map((name) => [
    name,
    process.env[name],
  ]),
);

try {
  process.env.VITE_ENABLE_DEMO_LOGIN = 'true';
  Object.assign(process.env, canaries);

  const loadedEnvironment = loadEnv('production', frontendRoot, 'VITE_');
  for (const [name, canary] of Object.entries(canaries)) {
    assert.equal(loadedEnvironment[name], canary, `Vite did not load ${name}`);
  }

  await build({
    root: frontendRoot,
    configFile: path.join(frontendRoot, 'vite.config.ts'),
    mode: 'production',
    logLevel: 'silent',
    build: {
      outDir: outputDirectory,
      emptyOutDir: true,
    },
  });

  const bundleText = await collectBundleText(outputDirectory);
  for (const canary of Object.values(canaries)) {
    assert.equal(bundleText.includes(canary), false, `production bundle contains ${canary}`);
  }
  assert.equal(bundleText.includes('dev-demo-console'), false);
  assert.equal(bundleText.includes('Portal Testing Console'), false);
  assert.equal(bundleText.includes('click any character role'), false);
  assert.equal(bundleText.includes('DEMO-STUDENT-001'), false);
} finally {
  for (const [name, value] of Object.entries(previousEnvironment)) {
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
  await rm(outputDirectory, { recursive: true, force: true });
}

console.log('production demo isolation test passed');
