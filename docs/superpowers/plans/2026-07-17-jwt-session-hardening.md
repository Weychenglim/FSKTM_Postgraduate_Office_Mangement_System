# JWT Session Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add short-lived bearer access tokens with HttpOnly rotating refresh cookies, revocation, automatic renewal, and password/account invalidation.

**Architecture:** Django and SimpleJWT remain authoritative for identity. SimpleJWT's blacklist app persists refresh-token state, a focused cookie authenticator protects refresh/logout, and the shared frontend API client keeps access tokens in memory while performing one concurrency-safe refresh and retry.

**Tech Stack:** Django 5.2, Django REST Framework 3.16, SimpleJWT 5.5, React 19, TypeScript 5.8, Vite 6.

---

### Task 1: Backend Session Contract Tests

**Files:**
- Create: `backend/accounts/test_jwt_sessions.py`

- [ ] Write tests that login responses contain `token` but never `refresh`, and set an HttpOnly strict refresh cookie.
- [ ] Write tests that refresh rotates the cookie, returns a new access token, and rejects the previous refresh token.
- [ ] Write tests that logout blacklists and deletes the refresh cookie.
- [ ] Write tests that missing, malformed, expired, inactive-user, and password-invalidated refresh cookies return `401`.
- [ ] Write tests that password-reset confirmation blacklists the user's outstanding refresh tokens.
- [ ] Run `python manage.py test accounts.test_jwt_sessions --keepdb` and verify failures occur because refresh/cookie revocation is not implemented.

### Task 2: Backend Refresh Lifecycle

**Files:**
- Create: `backend/accounts/authentication.py`
- Create: `backend/accounts/session_tokens.py`
- Modify: `backend/accounts/views.py`
- Modify: `backend/accounts/urls.py`
- Modify: `backend/config/settings.py`

- [ ] Add `rest_framework_simplejwt.token_blacklist` to `INSTALLED_APPS`.
- [ ] Configure `ACCESS_TOKEN_LIFETIME`, `REFRESH_TOKEN_LIFETIME`, rotation, blacklisting, and password revocation from environment-backed settings.
- [ ] Implement refresh-cookie set/delete helpers that never expose the refresh value in response JSON.
- [ ] Implement refresh-cookie authentication using `RefreshToken` plus `JWTAuthentication.get_user()` so blacklist, active-user, and password-hash checks share SimpleJWT semantics.
- [ ] Update login to set the refresh cookie and return only access/user JSON.
- [ ] Add authenticated refresh rotation and update logout to blacklist and delete its refresh cookie.
- [ ] Blacklist outstanding tokens after successful password reset.
- [ ] Run `python manage.py test accounts.test_jwt_sessions --keepdb` and verify all session contract tests pass.

### Task 3: Frontend Session Tests

**Files:**
- Create: `frontend/src/services/apiClient.test.ts`

- [ ] Add a source/runtime test proving access tokens are not persisted to localStorage or sessionStorage.
- [ ] Add fetch-driven tests proving refresh uses credentials, updates the in-memory token, retries one failed request once, and coalesces concurrent refresh attempts.
- [ ] Run `node_modules/.bin/tsx src/services/apiClient.test.ts` and verify it fails against the current access-only client.

### Task 4: Frontend Refresh and Retry

**Files:**
- Modify: `frontend/src/services/apiClient.ts`
- Modify: `frontend/src/services/authApi.ts`
- Modify: `frontend/src/App.tsx`

- [ ] Keep the access token in module memory only and add a shared refresh promise.
- [ ] Include credentials on backend requests and retry authenticated `401` responses exactly once after refresh.
- [ ] Add `restoreSession()` to refresh first and then call `/auth/me/`.
- [ ] Change application bootstrap to use `restoreSession()` instead of checking persisted access state.
- [ ] Preserve logout navigation while clearing in-memory state on every outcome.
- [ ] Run `node_modules/.bin/tsx src/services/apiClient.test.ts` and verify it passes.

### Task 5: Configuration and Governance Documentation

**Files:**
- Modify: `backend/.env.example`
- Modify: `PROJECT_REQUIREMENTS.md`
- Modify: `ARCHITECTURE_AND_CODING_DESIGN.md`
- Modify: `PROJECT_STATUS.md`
- Modify: `backend/README.md`

- [ ] Document token lifetime variables, cookie behavior, blacklist migrations, bearer/refresh boundaries, and the residual XSS/CSP risk.
- [ ] Record Announcements/Notifications as unchanged.

### Task 6: Verification and Commit

**Files:**
- Verify all changed files.

- [ ] Run `python manage.py migrate` to apply SimpleJWT blacklist migrations locally.
- [ ] Run `python manage.py test accounts.test_jwt_sessions --keepdb`.
- [ ] Run `python manage.py test accounts announcements appointments dashboard marks letters --keepdb`.
- [ ] Run `python manage.py check`, `python manage.py makemigrations --check --dry-run`, and a strict production `python manage.py check --deploy`.
- [ ] Run every frontend `.test.ts` script, `npm run lint`, and `npm run build`.
- [ ] Browser-smoke login, refresh, logout, and page restoration for Office Staff/Admin, Lecturer, Programme Coordinator, and Student.
- [ ] Review `git diff --check`, stage only scoped files, and commit as `security: harden JWT session lifecycle`.
