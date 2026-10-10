import assert from 'node:assert/strict';

const location = { pathname: '/dashboard' };
const target = Object.assign(new EventTarget(), { location });
Object.defineProperty(globalThis, 'window', { value: target, configurable: true });

const expiries: Array<string | undefined> = [];
target.addEventListener('fsktm:session-expired', (event) => {
  expiries.push((event as CustomEvent<{ message?: string } | null>).detail?.message);
});

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const {
  ApiError,
  clearAuthToken,
  fieldErrors,
  getAuthToken,
  request,
  requestMultipart,
  setAuthToken,
} = await import('./apiClient');
const authApi = await import('./authApi');

// Signing out drops the token at once; a quick sign-in waits for the sign-out
// to finish, so the late logout response cannot undo the new session.
{
  const order: string[] = [];
  let finishLogout!: (response: Response) => void;
  globalThis.fetch = ((input: RequestInfo | URL) => {
    const url = String(input);
    order.push(url);
    if (url.endsWith('/auth/logout/')) return new Promise<Response>((resolve) => { finishLogout = resolve; });
    return Promise.resolve(json(200, { token: 'session-b', user: { id: '1' } }));
  }) as typeof fetch;

  setAuthToken('session-a');
  const loggingOut = authApi.logout();
  assert.equal(getAuthToken(), null, 'logout clears the token before the request returns');
  const loggingIn = authApi.login('user@example.test', 'pw');
  await Promise.resolve();
  assert.deepEqual(order, ['/api/auth/logout/'], 'sign-in waits for the pending sign-out');
  finishLogout(json(200, { message: 'Logged out successfully.' }));
  await loggingOut;
  await loggingIn;
  assert.deepEqual(order, ['/api/auth/logout/', '/api/auth/login/']);
  assert.equal(getAuthToken(), 'session-b');
  assert.deepEqual(expiries, []);
}

// A logout whose refresh cookie is already gone is not a "session expired".
{
  globalThis.fetch = (async () => json(401, { detail: 'A valid refresh session is required.' })) as typeof fetch;
  setAuthToken('session-c');
  await authApi.logout();
  assert.equal(getAuthToken(), null);
  assert.deepEqual(expiries, []);
}

// A 401 that arrives after the session was replaced says nothing about the new one.
{
  let finish!: (response: Response) => void;
  globalThis.fetch = ((input: RequestInfo | URL) => String(input).endsWith('/auth/refresh/')
    ? Promise.resolve(json(401, { detail: 'invalid' }))
    : new Promise<Response>((resolve) => { finish = resolve; })) as typeof fetch;
  setAuthToken('old-session');
  const stale = request('/notifications/');
  await Promise.resolve();
  setAuthToken('new-session');
  finish(json(401, { detail: 'Token expired' }));
  await assert.rejects(stale, (err: unknown) => err instanceof ApiError && err.status === 401);
  assert.equal(getAuthToken(), 'new-session');
  assert.deepEqual(expiries, []);
}

// A forced password change that finishes after a sign-out must not sign back in.
{
  let finish!: (response: Response) => void;
  globalThis.fetch = (() => new Promise<Response>((resolve) => { finish = resolve; })) as typeof fetch;
  setAuthToken('forced-session');
  const changing = authApi.changePassword('Old-pass-1!', 'New-pass-2!');
  await Promise.resolve();
  clearAuthToken();
  finish(json(200, { message: 'Your password has been updated.', token: 'after-change' }));
  assert.equal(await changing, false);
  assert.equal(getAuthToken(), null);

  globalThis.fetch = (async () => json(200, { token: 'after-change' })) as typeof fetch;
  setAuthToken('forced-session');
  assert.equal(await authApi.changePassword('Old-pass-1!', 'New-pass-2!'), true);
  assert.equal(getAuthToken(), 'after-change');
}

// An account turned into a technical account mid-session is signed out with the reason.
{
  const reason = 'This is a technical account. Sign in through the admin site instead.';
  globalThis.fetch = (async () => json(403, { detail: reason, code: 'technical_account' })) as typeof fetch;
  setAuthToken('converted-session');
  await assert.rejects(request('/announcements/'), (err: unknown) => err instanceof ApiError && err.message === reason);
  assert.equal(getAuthToken(), null);
  assert.deepEqual(expiries, [reason]);

  // At sign-in there is no session to end; the login form shows the message itself.
  await assert.rejects(authApi.login('tech@example.test', 'pw'), new RegExp(reason.slice(0, 20)));
  assert.deepEqual(expiries, [reason]);
  expiries.length = 0;
}

// Error messages: nested field errors, gateway failures, unreadable bodies.
{
  globalThis.fetch = (async () => json(400, { preferences: { announcementAlerts: ['Must be a valid boolean.'] } })) as typeof fetch;
  await assert.rejects(request('/auth/settings/'), /Must be a valid boolean\./);

  globalThis.fetch = (async () => json(400, [{ code: 'x' }, 'Pick a programme.'])) as typeof fetch;
  await assert.rejects(request('/registry/students/'), /Pick a programme\./);

  for (const [status, body, expected] of [
    [500, '', /server is unavailable/],
    [502, '<html>Bad Gateway</html>', /server is unavailable/],
    [504, '', /server is unavailable/],
    [500, '<html>Traceback</html>', /server ran into a problem/],
  ] as const) {
    globalThis.fetch = (async () => new Response(body, { status })) as typeof fetch;
    await assert.rejects(request('/letter-templates/'), (err: unknown) =>
      err instanceof ApiError && err.status === status && expected.test(err.message));
  }

  globalThis.fetch = (async () => new Response('<html>proxy page</html>', { status: 200 })) as typeof fetch;
  await assert.rejects(
    requestMultipart('/registry/import/preview/', new FormData()),
    (err: unknown) => err instanceof ApiError && err.status === 200 && /unreadable/.test(err.message),
  );
}

// fieldErrors() picks the first message per field of a 400 only.
{
  globalThis.fetch = (async () => json(400, { name: ['Template name is required.'], content: 'Letter content is required.' })) as typeof fetch;
  const failure = await request('/letter-templates/').catch((err: unknown) => err);
  assert.deepEqual(fieldErrors(failure), { name: 'Template name is required.', content: 'Letter content is required.' });
  assert.deepEqual(fieldErrors(new ApiError('Forbidden', 403, { name: ['x'] })), {});
  assert.deepEqual(fieldErrors(new Error('offline')), {});
}

// Restoring a session on a portal page retries once (another tab may have just
// rotated the shared refresh cookie); on the sign-in page it does not.
{
  let refreshes = 0;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    if (String(input).endsWith('/auth/refresh/')) {
      refreshes += 1;
      return refreshes === 1 ? json(401, { detail: 'blacklisted' }) : json(200, { token: 'rotated-by-other-tab' });
    }
    return json(200, { id: '7', fullName: 'Restored User' });
  }) as typeof fetch;
  clearAuthToken();
  location.pathname = '/registry';
  const restored = await authApi.restoreSession();
  assert.equal(restored?.fullName, 'Restored User');
  assert.equal(refreshes, 2);

  refreshes = 0;
  globalThis.fetch = (async () => {
    refreshes += 1;
    return json(401, { detail: 'A valid refresh session is required.' });
  }) as typeof fetch;
  clearAuthToken();
  location.pathname = '/login';
  assert.equal(await authApi.restoreSession(), null);
  assert.equal(refreshes, 1);
  assert.deepEqual(expiries, []);
}

clearAuthToken();
console.log('Session race, error message and restore tests passed.');
