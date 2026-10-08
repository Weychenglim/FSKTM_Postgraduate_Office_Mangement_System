import assert from 'node:assert/strict';
import { getSettings, saveContact, savePreferences, changePassword } from './settingsApi';
import { getAuthToken, setAuthToken } from './apiClient';

const originalFetch = globalThis.fetch;
const calls: { url: string; method: string; body: unknown }[] = [];
try {
  globalThis.fetch = (async (input, init) => {
    calls.push({ url: String(input), method: init?.method ?? 'GET', body: init?.body ? JSON.parse(String(init.body)) : null });
    return new Response(JSON.stringify({ user: { phone: '0123456789' }, preferences: { announcementAlerts: false } }));
  }) as typeof fetch;
  const loaded = await getSettings();
  assert.equal(loaded.user.phone, '0123456789');
  await saveContact('0123456789');
  await savePreferences({ announcementAlerts: false });
  setAuthToken('existing-session');
  await changePassword(' old password ', ' new password ');
  assert.equal(getAuthToken(), null, 'successful password changes clear the local session');
  assert.deepEqual(calls, [
    { url: '/api/auth/settings/', method: 'GET', body: null },
    { url: '/api/auth/settings/', method: 'PATCH', body: { phone: '0123456789' } },
    { url: '/api/auth/settings/', method: 'PATCH', body: { preferences: { announcementAlerts: false } } },
    { url: '/api/auth/settings/password/', method: 'POST', body: { currentPassword: ' old password ', newPassword: ' new password ' } },
  ]);
  setAuthToken('keep-on-validation-failure');
  globalThis.fetch = (async () => new Response(JSON.stringify({ currentPassword: ['Current password is incorrect.'] }), { status: 400 })) as typeof fetch;
  await assert.rejects(changePassword('bad', 'next'), /Current password is incorrect/);
  assert.equal(getAuthToken(), 'keep-on-validation-failure');
  await assert.rejects(saveContact('bad'), /Current password is incorrect/);
  globalThis.fetch = (async () => { throw new Error('Network unavailable'); }) as typeof fetch;
  await assert.rejects(savePreferences({ announcementAlerts: true }), /Network unavailable/);
  const refreshCalls: string[] = [];
  setAuthToken('expired-access');
  globalThis.fetch = (async (input, init) => {
    const url = String(input);
    refreshCalls.push(url);
    if (url.endsWith('/refresh/')) return new Response(JSON.stringify({ token: 'renewed-access' }));
    if (new Headers(init?.headers).get('Authorization') === 'Bearer expired-access') return new Response(JSON.stringify({ detail: 'Token expired' }), { status: 401 });
    return new Response(JSON.stringify({ message: 'Password updated' }));
  }) as typeof fetch;
  await changePassword('old', 'new');
  assert.deepEqual(refreshCalls, ['/api/auth/settings/password/', '/api/auth/refresh/', '/api/auth/settings/password/']);
  assert.equal(getAuthToken(), null);
  let finishOldChange!: (response: Response) => void;
  globalThis.fetch = (() => new Promise<Response>((resolve) => { finishOldChange = resolve; })) as typeof fetch;
  setAuthToken('session-a');
  const delayedChange = changePassword('old', 'new');
  setAuthToken('session-b');
  finishOldChange(new Response(JSON.stringify({ message: 'Password updated' })));
  assert.equal(await delayedChange, false, 'a superseded session must not trigger the UI logout callback');
  assert.equal(getAuthToken(), 'session-b');
  let finishPassword!: (response: Response) => void;
  setAuthToken('current-session');
  globalThis.fetch = ((input) => String(input).endsWith('/settings/password/')
    ? new Promise<Response>((resolve) => { finishPassword = resolve; })
    : Promise.resolve(new Response(JSON.stringify({ detail: 'Session revoked' }), { status: 401 }))) as typeof fetch;
  const successfulChange = changePassword('old', 'new');
  await assert.rejects(getSettings(), /Session revoked/);
  finishPassword(new Response(JSON.stringify({ message: 'Password updated' })));
  assert.equal(await successfulChange, true, 'parallel token invalidation must still redirect the current user after success');
} finally { globalThis.fetch = originalFetch; setAuthToken(''); }
console.log('Settings API persistence, errors and password session handling passed');
