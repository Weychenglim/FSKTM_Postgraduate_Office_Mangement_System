# JWT Session Hardening Design

## Goal

Replace the current eight-hour, localStorage-backed access-only session with a short-lived bearer access token and a rotating, revocable refresh token that frontend JavaScript cannot read.

## Chosen Approach

Normal APIs continue to authenticate with `Authorization: Bearer <access-token>`. The access token lasts 15 minutes and is held only in frontend memory. A seven-day refresh token is stored in an HttpOnly, `SameSite=Strict` cookie scoped to `/api/auth/`; it is never returned in JSON, written to browser storage, placed in a URL, or logged.

SimpleJWT's maintained blacklist app owns outstanding and blacklisted refresh-token records. Refresh rotates the token and blacklists the previous token. Logout authenticates the refresh cookie, blacklists it, and clears the cookie. This is preferred over storing a long-lived refresh token in localStorage and over creating a parallel custom session model.

## Backend Design

- Add `rest_framework_simplejwt.token_blacklist` to `INSTALLED_APPS` and apply its upstream migrations.
- Configure access and refresh lifetimes through `JWT_ACCESS_TOKEN_MINUTES` and `JWT_REFRESH_TOKEN_DAYS`, defaulting to 15 minutes and 7 days.
- Enable `ROTATE_REFRESH_TOKENS`, `BLACKLIST_AFTER_ROTATION`, and `CHECK_REVOKE_TOKEN`.
- Add settings for the refresh-cookie name, path, secure flag, HttpOnly flag, and strict same-site policy. The secure flag follows `DEBUG`: local HTTP development uses `False`; production uses `True`.
- Login returns only the access token and user payload, and sets the refresh token as a cookie.
- A custom refresh-cookie authentication class validates signature, expiry, blacklist state, active-user state, and the password-hash revocation claim.
- `POST /api/auth/refresh/` requires a valid refresh cookie, rotates it, blacklists the prior token, and returns only a new access token.
- Logout requires a valid refresh cookie, blacklists it, clears it, and returns the existing success shape.
- Password reset changes the password. `CHECK_REVOKE_TOKEN` then rejects every previously issued access or refresh token; outstanding refresh records are also blacklisted for explicit revocation history.
- Account deactivation is enforced by refresh-cookie authentication and normal JWT authentication.

## Frontend Design

- Remove access-token persistence from localStorage. Keep the access token in module memory.
- Include credentials on API requests so the browser can send the scoped refresh cookie.
- Add one shared, concurrency-safe refresh operation. Multiple requests encountering expiry await the same refresh promise.
- On an authenticated `401`, refresh once and retry the original request once. Never retry refresh or login recursively.
- On application startup, attempt refresh before `/auth/me/`; a missing, expired, revoked, password-invalidated, or inactive session falls back to the normal login page.
- Logout calls the backend first and always clears the in-memory access token. A failed logout does not expose token material in its error.

## Error Handling

Missing, expired, malformed, blacklisted, password-invalidated, and inactive refresh tokens return `401`. Refresh-cookie deletion is included on terminal refresh failures and successful logout. API requests retry at most once to prevent loops. Existing endpoint error extraction remains authoritative for user-facing messages.

## Security Boundaries

- Refresh cookies authorize only refresh and logout endpoints; they do not authenticate application APIs.
- Access tokens remain bearer tokens and are sent only in headers.
- Cookie scope is `/api/auth/`, HttpOnly is always enabled, and production always enables Secure.
- `SameSite=Strict`, explicit production CORS origins, and credentialed CORS prevent untrusted origins from reading authenticated responses.
- XSS can use an active in-memory access token while malicious code is executing, but it cannot directly extract the seven-day refresh credential. Content Security Policy remains the next separate defense-in-depth slice.

## Verification

Backend tests cover configured lifetimes, cookie attributes, refresh rotation, old-token rejection, logout revocation, missing/invalid cookies, password reset invalidation, inactive users, and response bodies never exposing refresh tokens. Frontend tests cover memory-only storage, startup restoration, one-time retry, shared concurrent refresh, and terminal session clearing. Full Django tests, every frontend test script, lint, build, migration checks, and a four-role browser smoke complete the slice.
