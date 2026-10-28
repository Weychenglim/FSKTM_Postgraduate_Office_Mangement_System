// Called only by marks.browser_journey against Django's disposable live test server.
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createServer, request as httpRequest } from 'node:http';
import { access, readFile, readdir, mkdtemp, rm, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, isAbsolute, basename } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

let input = '';
for await (const chunk of process.stdin) input += chunk;
const config = JSON.parse(input);
const backend = new URL(config.backend);
assert.equal(backend.protocol, 'http:');
assert.ok(['127.0.0.1', 'localhost'].includes(backend.hostname));
assert.ok(backend.port && !['8000', '3000', '3001'].includes(backend.port), 'Never target a development server');
let chrome;
for (const path of [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].filter(Boolean)) {
  try { await access(path); chrome = path; break; } catch {}
}
assert.ok(chrome, 'Chrome or Edge is required');
const directory = await mkdtemp(join(tmpdir(), 'marks-real-journey-'));
const bundle = join(directory, 'fixture.js');
let server;
let interruptSubmission = true;
try {
  await build({ entryPoints: ['tests/marksJourney.fixture.tsx'], outfile: bundle, bundle: true, format: 'esm', platform: 'browser', define: { 'process.env.NODE_ENV': '"production"' }, logLevel: 'error' });
  const css = (await readdir('dist/assets')).find(name => name.startsWith('index-') && name.endsWith('.css'));
  assert.ok(css, 'Run npm run build before the journey');
  server = createServer(async (req, res) => {
    if (req.url.startsWith('/api/')) {
      const proxy = httpRequest(new URL(req.url, backend), { method: req.method, headers: { ...req.headers, host: backend.host } }, upstream => {
        if (interruptSubmission && req.method === 'POST' && /\/tasks\/\d+\/submit\/$/.test(req.url) && upstream.statusCode === 200) {
          interruptSubmission = false;
          // The real backend has committed. Simulate a gateway losing that result.
          upstream.resume();
          upstream.on('end', () => { res.writeHead(502, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ detail: 'The submission response was interrupted. Retry to confirm the result.' })); });
          return;
        }
        res.writeHead(upstream.statusCode, upstream.headers); upstream.pipe(res);
      });
      proxy.on('error', () => { res.writeHead(502); res.end('Test backend unavailable'); });
      req.pipe(proxy); return;
    }
    res.setHeader('Cache-Control', 'no-store');
    if (req.url === '/journey-config') { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(config)); return; }
    if (req.url === '/fixture.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(await readFile(bundle)); return; }
    if (req.url === '/style.css') { res.setHeader('Content-Type', 'text/css'); res.end(await readFile(join('dist/assets', css))); return; }
    res.setHeader('Content-Type', 'text/html');
    res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body style="padding:24px;background:#f1f5f9"><div id="root" style="max-width:1100px;margin:0 auto"></div><pre id="journey-results" hidden>RUNNING</pre><script type="module" src="/fixture.js"></script></body></html>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const { stdout } = await promisify(execFile)(chrome, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    `--user-data-dir=${join(directory, 'profile')}`, '--window-size=1440,1400', '--dump-dom', '--virtual-time-budget=120000',
    `http://127.0.0.1:${server.address().port}/marks`,
  ], { timeout: 150000, maxBuffer: 3 * 1024 * 1024, windowsHide: true });
  const encoded = stdout.match(/<pre id="journey-results"[^>]*>([\s\S]*?)<\/pre>/)?.[1];
  assert.ok(encoded && encoded !== 'RUNNING', 'Browser journey did not finish');
  const result = JSON.parse(encoded.replaceAll('&quot;', '"').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&'));
  assert.equal(result.error, undefined, JSON.stringify(result));
  assert.equal(result.checks.length, 29, 'The complete journey including non-admin Office correction/reopening must run');
  console.log(result.checks.map(check => `PASS ${check}`).join('\n'));
} finally {
  if (server) await new Promise(resolve => server.close(resolve));
  const resolved = await realpath(directory);
  const within = relative(await realpath(tmpdir()), resolved);
  assert.ok(!isAbsolute(within) && !within.startsWith('..') && basename(resolved).startsWith('marks-real-journey-'));
  await rm(resolved, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
