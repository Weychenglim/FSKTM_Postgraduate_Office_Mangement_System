# Carryover and semester handover acceptance plan

> Execute sequentially in this session under the user's acceptance authorization. Preserve all existing uncommitted work. This adds tests and evidence, not workflow behavior.

**Goal:** Verify reasoned reassessment grant/replacement/revocation/consumption for all three appointment kinds, and guarded semester activation with retained historical Marks.

**Architecture:** Reuse disposable LiveServerTestCase fixtures, production React components/services, ephemeral authenticated HTTP and exact iframe viewports. Separate reassessment cases from semester activation so no live clock or development record changes are needed.

**Tech stack:** Django/PostgreSQL, React/TypeScript, esbuild and native headless Chrome/Edge.

**Spec:** PROJECT_REQUIREMENTS.md carryover capacity reassessment, central semester and completion-window rules; pending register A04.

## Constraints

- Runner-created test databases only; fictional participants and in-memory test JWTs.
- No schema, dependencies, runtime policy, live clock, credentials or production record changes.
- Reassessment changes the capacity policy used, not request semester or approval stage. Consumption must record the policy actually checked.
- Distinguish component/HTTP, persisted record and backend race/migration evidence from full application-shell and remaining compound cases.

## Tasks

- [x] Add `backend/appointments/carryover_browser_journey.py` with independently isolated Supervisor, supporting and Panel fixtures at 1440/390px; verify exact Marks snapshots and reassessment event/actor/semester invariants.
- [x] Add `frontend/tests/carryoverJourney.fixture.tsx` using CapacityReassessments and SemesterActivationSection. Verify required reasons, replacement/revocation/stale recovery, role scope, original/current policy and real final approvals. Activation must require fresh preview/reason/unfinished acknowledgement and preserve submitted/draft/window data.
- [x] Add `frontend/tests/carryoverJourney.browser.mjs` using the existing real-loopback/exact-iframe/guarded-cleanup pattern.
- [x] Run the opt-in journeys with reassessment API/concurrency/migration, activation/closure-preview and Marks completion-window regressions. Verify TypeScript/build, Django/migration and scoped syntax/whitespace.
- [x] Directly review the added tests, record independent review unavailability due to the existing account usage limit, and update A04/E13 evidence/report plus the three root documents.
