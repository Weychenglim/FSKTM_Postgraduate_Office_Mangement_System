/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Authentication API. Talks to the real Django backend (`/api/auth/*`) — auth
 * is always live, regardless of the `USE_MOCKS` flag used by the data services.
 *
 * On a successful login the JWT is stored via `setAuthToken`, so every
 * subsequent `request()` call automatically sends `Authorization: Bearer …`.
 */

import { DemoUser } from '../types';
import { request, setAuthToken, clearAuthToken } from './apiClient';

export interface LoginResponse {
  token: string;
  user: DemoUser;
}

export async function login(identifier: string, password: string): Promise<LoginResponse> {
  const res = await request<LoginResponse>('/auth/login/', {
    method: 'POST',
    body: JSON.stringify({ identifier, password }),
  });
  setAuthToken(res.token);
  return res;
}

export async function logout(): Promise<void> {
  try {
    await request('/auth/logout/', { method: 'POST' });
  } finally {
    // Always drop the local token, even if the network call fails.
    clearAuthToken();
  }
}

/**
 * Ask the backend to email a password-reset link. Resolves on success; the
 * backend intentionally returns 200 even for unknown emails (no enumeration).
 */
export async function requestPasswordReset(email: string): Promise<void> {
  await request('/auth/password-reset/', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

/** Complete a reset using the uid + token from the email link. */
export async function confirmPasswordReset(
  uid: string,
  token: string,
  newPassword: string,
): Promise<void> {
  await request('/auth/password-reset/confirm/', {
    method: 'POST',
    body: JSON.stringify({ uid, token, new_password: newPassword }),
  });
}

/** Fetch the currently authenticated user (requires a stored token). */
export async function getCurrentUser(): Promise<DemoUser> {
  return request<DemoUser>('/auth/me/');
}
