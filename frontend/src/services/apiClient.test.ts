import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';


const apiClientSource = readFileSync(resolve('src/services/apiClient.ts'), 'utf8');
assert.doesNotMatch(apiClientSource, /localStorage|sessionStorage/);
const authApiSource = readFileSync(resolve('src/services/authApi.ts'), 'utf8');
const appSource = readFileSync(resolve('src/App.tsx'), 'utf8');
assert.match(authApiSource, /export async function restoreSession/);
assert.match(authApiSource, /refreshAuthToken/);
assert.match(appSource, /authApi\s*\.restoreSession\(\)/);
assert.doesNotMatch(appSource, /getAuthToken/);
assert.match(
  appSource,
  /useEffect\(\(\) => \{[\s\S]{0,250}pathname === APP_ROUTES\.resetPassword/,
);

type SessionContract = {
  setAccessToken(token: string): void;
  getAccessToken(): string | null;
  clearAccessToken(): void;
  refreshAccessToken(): Promise<string | null>;
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
};

type SessionConstructor = new (
  fetcher: typeof fetch,
  refreshUrl: string,
) => SessionContract;

let AuthSession: SessionConstructor;
try {
  const modulePath = './authSession.ts';
  const sessionModule = await import(modulePath);
  AuthSession = sessionModule.AuthSession as SessionConstructor;
} catch (error) {
  assert.fail(`AuthSession must be implemented: ${String(error)}`);
}

{
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  let protectedCalls = 0;
  const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    if (url === '/api/auth/refresh/') {
      return new Response(JSON.stringify({ token: 'renewed-access-token' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    protectedCalls += 1;
    return protectedCalls === 1
      ? new Response(null, { status: 401 })
      : new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
  }) as typeof fetch;

  const session = new AuthSession(fetcher, '/api/auth/refresh/');
  session.setAccessToken('expired-access-token');
  const response = await session.fetch('/api/private/');

  assert.equal(response.status, 200);
  assert.equal(session.getAccessToken(), 'renewed-access-token');
  assert.equal(calls.length, 3);
  assert.equal(
    new Headers(calls[0].init?.headers).get('Authorization'),
    'Bearer expired-access-token',
  );
  assert.equal(calls[1].url, '/api/auth/refresh/');
  assert.equal(new Headers(calls[1].init?.headers).get('Authorization'), null);
  assert.equal(calls[1].init?.credentials, 'include');
  assert.equal(
    new Headers(calls[2].init?.headers).get('Authorization'),
    'Bearer renewed-access-token',
  );
}

{
  let resolveRefresh: ((response: Response) => void) | undefined;
  let refreshCalls = 0;
  const fetcher = (async () => {
    refreshCalls += 1;
    return new Promise<Response>((resolvePromise) => {
      resolveRefresh = resolvePromise;
    });
  }) as typeof fetch;
  const session = new AuthSession(fetcher, '/api/auth/refresh/');

  const first = session.refreshAccessToken();
  const second = session.refreshAccessToken();
  await Promise.resolve();
  assert.equal(refreshCalls, 1);
  resolveRefresh?.(
    new Response(JSON.stringify({ token: 'shared-access-token' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );

  assert.equal(await first, 'shared-access-token');
  assert.equal(await second, 'shared-access-token');
  assert.equal(session.getAccessToken(), 'shared-access-token');
}

{
  let calls = 0;
  const fetcher = (async () => {
    calls += 1;
    return new Response(null, { status: 401 });
  }) as typeof fetch;
  const session = new AuthSession(fetcher, '/api/auth/refresh/');
  session.setAccessToken('invalid-access-token');

  const response = await session.fetch('/api/private/');

  assert.equal(response.status, 401);
  assert.equal(calls, 2);
  assert.equal(session.getAccessToken(), null);
}

console.log('JWT API session tests passed.');
