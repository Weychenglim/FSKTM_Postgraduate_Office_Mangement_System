# Supporting supervision acceptance plan

> Execute sequentially in this session. The user authorized the remaining five-module acceptance work. Preserve the existing uncommitted Marks work.

**Goal:** Establish real HTTP/browser and persisted evidence for supporting nomination, candidate/Coordinator decisions, replacement, closure and privacy.

**Architecture:** An opt-in Django LiveServerTestCase creates disposable participants, a primary/Panel appointment and submitted Marks. A headless-browser test mounts the existing production supervisory-team component and uses its real authenticated API services. The browser performs workflow actions; final database assertions verify actors, audit counts, replacement lineage and preservation of primary/Panel/research/Marks records.

**Stack:** Existing Django/DRF/PostgreSQL, React/TypeScript, esbuild and installed Chrome/Edge. No dependency or schema change.

**Sources:** Root requirements/design/status; pending register A01; existing supporting-supervision API, lifecycle and concurrency tests.

## Constraints

- Use only runner-created test databases and temporary browser profiles/bundles; never seed or change development academic data.
- Keep test JWTs in memory; do not persist or print them.
- Exercise production UI and HTTP endpoints. Identify the login screen/full application shell and fault cases as outside this component-level journey.
- Do not change permissions, faculty policy or production behavior merely to obtain a passing test.
- Record scoped evidence; retain external faculty policy/template conditions and unexercised compound requirements as pending.

## Tasks

- [x] Add `backend/appointments/supporting_browser_journey.py` using the established Marks LiveServerTestCase pattern. Assert the disposable-database boundary before fixtures. Preserve exact primary, Panel, research and submitted Marks snapshots.
- [x] Add `frontend/tests/supportingJourney.fixture.tsx`: student nomination denial; required justification; candidate rejection; primary cancellation; acceptance then scoped Coordinator approval; incumbent retained through pending replacement; replacement approval; former-member access loss with own history; reasoned closure; Student redaction; supporting-role Marks denial and unchanged Office result.
- [x] Add `frontend/tests/supportingJourney.browser.mjs`: ephemeral loopback-only proxy, no mocked academic responses, production component bundle, desktop/phone viewport, bounded browser execution, result assertions and guarded temporary-file cleanup.
- [x] Run the journey at 1440px and 390px; diagnose any failure before changing production code.
- [x] Run `appointments.test_co_supervision`, `appointments.test_co_supervision_lifecycle` and `appointments.test_co_supervision_concurrency` together with the browser journey on a unique disposable PostgreSQL database. Run TypeScript, production build, Django checks, migration drift and scoped whitespace checks.
- [x] Record commands/results/limits in `docs/SUPPORTING_SUPERVISION_ACCEPTANCE_2026-10-25.md`, add the checklist evidence and update A01 plus affected root documentation. Do not promote compound/external clauses without full evidence.
