# Office business authorization implementation plan

> Execute inline with the executing-plans skill, using test-first changes and direct review. No subagent dispatch, commit or push is requested.

**Goal:** Authorized Office accounts retain portal actions without Django admin eligibility.

**Architecture:** Shared active-Office policy, separate submitted-Marks permission, and a technical-only default AdminSite preserving registered models. Explicit preview/apply command converts existing Office staff flags while retaining credentials and permissions.

**Tech stack:** Django, DRF, PostgreSQL, existing React/Chrome acceptance harnesses.

**Spec:** `docs/superpowers/specs/2026-10-25-office-business-authorization-design.md`.

## Constraints

Preserve A04 uncommitted work and all business validations, programme scope, audit and concurrency rules. No dependency, academic schema, role or approval changes. Tests must use disposable databases; no demo reseeding on the development database. Update all three root documents and pending register.

## Task 1: Office policy and real workflow regression

- [x] Write non-admin Office tests in `accounts/test_office_authorization.py`, using existing workflow fixtures and explicit expected HTTP/persistence results. Adapt Marks permission/completion expectations to the new contract before implementation. Watch staff-coupled actions fail.
- [x] Add `office_actor(user)` and `can_correct_marks(user)` in `accounts/authorization.py`. Active/authenticated Office is required; correction also needs `marks.change_markentry`.
- [x] Replace staff coupling in `accounts/participant_lifecycle.py`, `accounts/delegations.py`, `appointments/research_amendments.py`, `appointments/capacity_reassessment.py`, `appointments/coordinator_workspace.py`, `appointments/coordinator_workspace_views.py`, `marks/services.py`, `marks/views.py`, `marks/completion_windows.py`.
- [x] Enforce correction/reopening permission inside both service entry points; configuration services require active Office but not correction permission. Verify real successful actions and denied no-op behavior.

## Task 2: Technical-only admin and provisioning

- [x] Write login/session, form, seed and conversion tests; demonstrate failures first.
- [x] Add `accounts/admin_site.py` with `TechnicalAdminSite.has_permission`, plus technical login form; select it through `AccountsConfig.default_site` in a Django AdminConfig registered in `config/settings.py`.
- [x] Reject Office staff flags in `accounts/forms.py`. Update `accounts/management/commands/seed_users.py` to non-staff Office and explicit Marks permission only.
- [x] Add `accounts/management/commands/separate_office_admin_access.py`: preview by default; explicit apply; lock selected rows; verify technical recovery account and no mixed-role superusers; clear only Office staff flags; preserve everything else; no credential output.
- [x] Move protected-admin inspection test actors to dedicated technical users. Keep explicit Office denial tests and protected crafted POST assertions.

## Task 3: Review and verify

- [x] Run affected accounts/appointments/academics/dashboard/Marks tests on a unique disposable test database; resolve demonstrated regressions without weakening assertions.
- [x] Run existing real browser journeys with non-admin Office actors, including Marks and workflow coverage; keep browser and API evidence distinct.
- [x] Run TypeScript/build, Django check/migration drift, Node syntax and whitespace checks. Review every changed production authorization branch and account-conversion side effect.
- [x] Record measured results, deployment command and any remaining limitations; update requirements, architecture, status, pending register and acceptance evidence. Leave unrelated acceptance items pending.

## Execution outcome

Full source gate: 1,551 backend tests, 487.320 seconds. Browser gate: 17 journeys, 719 assertions; final Marks rerun: 1 test/29 assertions, 27.274 seconds. TypeScript/build and Django/migration/syntax checks pass. Dedicated local technical login created and verified; generated credential remains ignored. Runtime restart was rejected by automatic approval review (only “blocked by policy”). Existing local API/Office flag remain unchanged; restart from updated source before applying conversion. This runtime step is outstanding, not marked as delivered. No commit/push or independent reviewer pass claimed.
