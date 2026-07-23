import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolveConfig } from 'vite';

import {
  buildLetterHtml,
  LetterData,
  openLetterDocument,
} from './letterDocument';

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const repositoryRoot = path.resolve(frontendRoot, '..');
const nginxDirectory = path.join(repositoryRoot, 'deploy', 'nginx');
const reportOnlyPath = path.join(nginxDirectory, 'csp-report-only.conf');
const enforcedPath = path.join(nginxDirectory, 'csp-enforced.conf');
const siteTemplatePath = path.join(
  nginxDirectory,
  'fsktm-postgraduate.conf.example',
);
const packageJson = JSON.parse(
  readFileSync(path.join(frontendRoot, 'package.json'), 'utf8'),
) as { scripts?: Record<string, string> };

assert.match(
  packageJson.scripts?.['test:production-security'] ?? '',
  /productionContentSecurity\.test\.ts/u,
  'the focused production-security script must include the CSP contract',
);

for (const requiredPath of [reportOnlyPath, enforcedPath, siteTemplatePath]) {
  assert.equal(
    existsSync(requiredPath),
    true,
    `missing production security configuration: ${requiredPath}`,
  );
}

const viteConfig = await resolveConfig(
  {
    configFile: path.join(frontendRoot, 'vite.config.ts'),
    logLevel: 'silent',
  },
  'build',
  'production',
);
assert.equal(
  viteConfig.build.sourcemap,
  false,
  'production source maps must be explicitly disabled',
);

function extractPolicy(source: string, headerName: string): string {
  const match = source.match(
    new RegExp(`add_header\\s+${headerName}\\s+"([^"]+)"\\s+always;`, 'u'),
  );
  assert.ok(match, `${headerName} header is missing or malformed`);
  return match[1].replace(/\s+/gu, ' ').trim();
}

const reportOnlyConfig = readFileSync(reportOnlyPath, 'utf8');
const enforcedConfig = readFileSync(enforcedPath, 'utf8');
const reportOnlyPolicy = extractPolicy(
  reportOnlyConfig,
  'Content-Security-Policy-Report-Only',
);
const enforcedPolicy = extractPolicy(
  enforcedConfig,
  'Content-Security-Policy',
);

assert.equal(
  reportOnlyPolicy,
  enforcedPolicy,
  'report-only and enforced CSP directives must remain identical',
);

const requiredDirectives = [
  "default-src 'none'",
  "base-uri 'self'",
  "connect-src 'self'",
  "font-src 'self' https://fonts.gstatic.com",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "frame-src 'none'",
  "img-src 'self' data: https://images.unsplash.com",
  "manifest-src 'self'",
  "media-src 'none'",
  "object-src 'none'",
  "script-src 'self'",
  "script-src-attr 'none'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "worker-src 'none'",
  'upgrade-insecure-requests',
];

for (const directive of requiredDirectives) {
  assert.ok(
    enforcedPolicy.split(';').map((value) => value.trim()).includes(directive),
    `CSP is missing required directive: ${directive}`,
  );
}

assert.doesNotMatch(enforcedPolicy, /\*/u);
assert.doesNotMatch(enforcedPolicy, /'unsafe-eval'/u);
assert.doesNotMatch(enforcedPolicy, /script-src[^;]*'unsafe-inline'/u);

const externalOrigins = new Set(
  enforcedPolicy.match(/https:\/\/[a-z0-9.-]+/giu) ?? [],
);
assert.deepEqual(
  [...externalOrigins].sort(),
  ['https://fonts.googleapis.com', 'https://fonts.gstatic.com', 'https://images.unsplash.com'],
);

const siteTemplate = readFileSync(siteTemplatePath, 'utf8');
for (const expected of [
  'listen 80 default_server;',
  'listen 443 ssl default_server;',
  'ssl_reject_handshake on;',
  'return 444;',
  'return 301 https://$server_name$request_uri;',
  'listen 443 ssl http2;',
  'client_max_body_size 12m;',
  'root /srv/fsktm/frontend/dist;',
  'try_files $uri $uri/ /index.html;',
  'location /static/',
  'alias /srv/fsktm/backend/staticfiles/;',
  'location ~* \\.map$',
  'return 404;',
  'location /api/',
  'location = /admin',
  'return 301 /admin/;',
  'location /admin/',
  'proxy_set_header Host $host;',
  'proxy_set_header X-Forwarded-Proto $scheme;',
  'include /etc/nginx/fsktm/csp-report-only.conf;',
]) {
  assert.ok(siteTemplate.includes(expected), `Nginx template is missing: ${expected}`);
}

assert.equal(
  (siteTemplate.match(/proxy_hide_header Strict-Transport-Security;/gu) ?? []).length,
  2,
  'both proxied Django locations must suppress the upstream HSTS header',
);
assert.doesNotMatch(siteTemplate, /return 301 https:\/\/\$host/iu);
assert.doesNotMatch(siteTemplate, /^\s*http2 on;/imu);

for (const expectedHeader of [
  'Strict-Transport-Security "max-age=3600"',
  'X-Content-Type-Options "nosniff"',
  'Referrer-Policy "same-origin"',
  'X-Frame-Options "DENY"',
]) {
  assert.ok(
    siteTemplate.includes(expectedHeader),
    `Nginx template is missing security header: ${expectedHeader}`,
  );
}

const letterData: LetterData = {
  templateName: 'Enrollment Confirmation',
  refNo: 'DEMO/LETTER/001',
  date: '23 July 2026',
  bodyParagraphs: 'This is a demonstration letter.',
  studentName: 'Demo Student',
  matricNumber: 'DEMO-STUDENT-001',
};

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
let writtenHtml = '';
let printCalled = false;
let focusCalled = false;
let closeCalled = false;
const listeners = new Map<string, EventListenerOrEventListenerObject>();
const popup = {
  document: {
    open() {},
    write(value: string) {
      writtenHtml = value;
    },
    close() {},
  },
  addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    listeners.set(type, listener);
  },
  focus() {
    focusCalled = true;
  },
  print() {
    printCalled = true;
  },
  close() {
    closeCalled = true;
  },
};

Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: {
    location: { origin: 'https://portal.example.test' },
    open: () => popup,
  },
});

try {
  const html = buildLetterHtml(letterData);
  assert.doesNotMatch(html, /<script\b/iu);
  assert.equal(openLetterDocument(letterData), true);
  assert.equal(writtenHtml, html);

  const loadListener = listeners.get('load');
  const afterPrintListener = listeners.get('afterprint');
  assert.equal(typeof loadListener, 'function');
  assert.equal(typeof afterPrintListener, 'function');

  (loadListener as EventListener)(new Event('load'));
  assert.equal(focusCalled, true);
  assert.equal(printCalled, true);

  (afterPrintListener as EventListener)(new Event('afterprint'));
  assert.equal(closeCalled, true);
} finally {
  if (originalWindow) {
    Object.defineProperty(globalThis, 'window', originalWindow);
  } else {
    Reflect.deleteProperty(globalThis, 'window');
  }
}

console.log('production CSP and artifact configuration tests passed');
