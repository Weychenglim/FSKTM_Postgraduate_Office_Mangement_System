import assert from 'node:assert/strict';

const target = new EventTarget();
Object.defineProperty(globalThis, 'window', { value: target, configurable: true });

let fired = 0;
target.addEventListener('fsktm:password-change-required', () => {
  fired += 1;
});

const respondWith = (status: number, body: unknown) => {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })) as typeof fetch;
};

const { ApiError, PASSWORD_CHANGE_REQUIRED_EVENT, request } = await import('./apiClient');
assert.equal(PASSWORD_CHANGE_REQUIRED_EVENT, 'fsktm:password-change-required');

respondWith(403, {
  detail: 'Change your password before continuing.',
  code: 'password_change_required',
});
await assert.rejects(
  request('/notifications/'),
  (err: unknown) =>
    err instanceof ApiError
    && err.status === 403
    && err.message === 'Change your password before continuing.',
);
assert.equal(fired, 1);

respondWith(403, { detail: 'You do not have permission to perform this action.' });
await assert.rejects(request('/registry/students/'));
assert.equal(fired, 1);

console.log('Password-change-required API client tests passed.');
