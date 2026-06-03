/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Thin API client shared by every *Api.ts service.
 *
 * Set USE_MOCKS = true to fall back to local mock data (no server needed).
 * Set USE_MOCKS = false to use real HTTP for the data services.
 *
 * Currently true: only auth is wired to the real (Django) backend — every other
 * screen runs on mock data until its endpoints exist. Note that `request()`
 * below ignores this flag, so `authApi` always talks to the real backend.
 */

export const USE_MOCKS = true;
export const API_BASE_URL = '/api';

// Simulated network latency for mock responses (ms).
const MOCK_LATENCY_MS = 500;

export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Wrap mock data so callers get the same async shape (and a deep copy, so they
 * can't accidentally mutate the shared mock arrays) they will get from HTTP.
 */
export async function mockResponse<T>(
  data: T,
  options?: { latencyMs?: number; failRate?: number }
): Promise<T> {
  await delay(options?.latencyMs ?? MOCK_LATENCY_MS);
  if (options?.failRate && Math.random() < options.failRate) {
    throw new ApiError('Simulated network error. Please try again.');
  }
  return typeof structuredClone === 'function'
    ? structuredClone(data)
    : (JSON.parse(JSON.stringify(data)) as T);
}

// ─── Token management ────────────────────────────────────────────────────────

let _authToken: string | null = null;

export function setAuthToken(token: string): void {
  _authToken = token;
}

export function clearAuthToken(): void {
  _authToken = null;
}

// ─── HTTP helper ─────────────────────────────────────────────────────────────

/**
 * Pull a human-readable message out of an error response body. Handles our
 * Django/DRF shapes: `{ error }`, `{ detail }`, and field errors like
 * `{ new_password: ["too short", ...] }`.
 */
function messageFromErrorBody(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  const record = body as Record<string, unknown>;
  if (typeof record.error === 'string') return record.error;
  if (typeof record.detail === 'string') return record.detail;
  for (const value of Object.values(record)) {
    if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
      return value[0];
    }
    if (typeof value === 'string') return value;
  }
  return null;
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((init?.headers as Record<string, string>) ?? {}),
  };
  if (_authToken) {
    headers['Authorization'] = `Bearer ${_authToken}`;
  }
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });
  if (!res.ok) {
    let message = `Request failed: ${res.status} ${res.statusText}`;
    try {
      const extracted = messageFromErrorBody(await res.json());
      if (extracted) message = extracted;
    } catch {
      /* error body was not JSON — keep the status-based message */
    }
    throw new ApiError(message, res.status);
  }
  // 204 No Content (or empty body) → nothing to parse.
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
