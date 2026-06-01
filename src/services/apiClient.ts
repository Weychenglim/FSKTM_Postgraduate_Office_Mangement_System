/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Thin API client shared by every *Api.ts service.
 *
 * Today the services return mock data through `mockResponse`, but they already
 * have the async (Promise) shape a real backend will use. When the backend is
 * ready:
 *   1. Set USE_MOCKS = false (or wire it to an env var).
 *   2. Replace the `mockResponse(...)` body of each service function with the
 *      matching `request(...)` call that is already stubbed alongside it.
 * Components calling the services do not change.
 */

// Flip to false once real endpoints exist. Kept as a plain constant so the
// project compiles without Vite env typings; wire to import.meta.env later.
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
 * Pass `failRate` (0–1) to exercise component error states during development.
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

/**
 * Real HTTP helper for when the backend lands. Unused while USE_MOCKS is true.
 */
export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    throw new ApiError(`Request failed: ${res.status} ${res.statusText}`, res.status);
  }
  return (await res.json()) as T;
}
