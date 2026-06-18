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
 *   1. Set VITE_USE_MOCKS=false and VITE_API_BASE_URL to the backend URL.
 *   2. Replace the `mockResponse(...)` body of each service function with the
 *      matching `request(...)` call that is already stubbed alongside it.
 * Components calling the services do not change.
 */

const parseBooleanEnv = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined || value.trim() === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
};

const parseNumberEnv = (value: string | undefined, fallback: number): number => {
  if (value === undefined || value.trim() === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

export const USE_MOCKS = parseBooleanEnv(import.meta.env.VITE_USE_MOCKS, true);
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim() || '/api';

// Simulated network latency for mock responses (ms).
const MOCK_LATENCY_MS = parseNumberEnv(import.meta.env.VITE_MOCK_LATENCY_MS, 500);

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

// Persisted in localStorage so the session survives a page refresh / new tab.
const AUTH_TOKEN_KEY = 'fsktm_auth_token';

function readStoredToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    // Storage blocked (e.g. private mode) — fall back to in-memory only.
    return null;
  }
}

// Seed from storage at module load so a refresh keeps the user logged in.
let _authToken: string | null = readStoredToken();

export function setAuthToken(token: string): void {
  _authToken = token;
  try {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } catch {
    /* storage unavailable — keep the in-memory token for this tab */
  }
}

export function clearAuthToken(): void {
  _authToken = null;
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

/** Whether a token is currently held (used to bootstrap the session on load). */
export function getAuthToken(): string | null {
  return _authToken;
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
  const isFormDataBody = typeof FormData !== 'undefined' && init?.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormDataBody ? {} : { 'Content-Type': 'application/json' }),
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

/** Build and throw an ApiError from a non-OK response (shared by the helpers below). */
async function raiseForStatus(res: Response): Promise<never> {
  let message = `Request failed: ${res.status} ${res.statusText}`;
  try {
    const extracted = messageFromErrorBody(await res.json());
    if (extracted) message = extracted;
  } catch {
    /* error body was not JSON — keep the status-based message */
  }
  throw new ApiError(message, res.status);
}

/**
 * Send a `multipart/form-data` body (used for file uploads). The browser sets
 * `Content-Type` with the correct boundary, so we must NOT set it ourselves.
 */
export async function requestMultipart<T>(
  path: string,
  formData: FormData,
  init?: RequestInit,
): Promise<T> {
  const headers: Record<string, string> = {
    ...((init?.headers as Record<string, string>) ?? {}),
  };
  if (_authToken) {
    headers['Authorization'] = `Bearer ${_authToken}`;
  }
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    ...init,
    body: formData,
    headers,
  });
  if (!res.ok) return raiseForStatus(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Fetch a binary file (with auth) as a Blob — used for attachment downloads. */
export async function requestBlob(path: string, init?: RequestInit): Promise<Blob> {
  const headers: Record<string, string> = {
    ...((init?.headers as Record<string, string>) ?? {}),
  };
  if (_authToken) {
    headers['Authorization'] = `Bearer ${_authToken}`;
  }
  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  if (!res.ok) return raiseForStatus(res);
  return res.blob();
}
