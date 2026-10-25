# Marks write reliability implementation plan

> Implement sequentially in this session using the approved design and test-first workflow.

**Goal:** Prevent stale lecturer drafts from overwriting newer marks and make submission retries safe.

**Architecture:** Required opaque write versions are checked under the existing task/entry locks. Submission saves the reviewed payload and locks the entry in one transaction; a task-scoped immutable receipt binds a submission UUID to the exact request and resulting entry version. The form retains a UUID for an unchanged failed attempt and provides explicit reload recovery for conflicts.

**Stack:** Existing Django/DRF/PostgreSQL and React/TypeScript. No new dependencies.

**Spec:** Approved brainstorm and critique in this conversation; updated PROJECT_REQUIREMENTS.md.

## Constraints

- Preserve ownership, eligibility, deadline, correction, reopening and lifecycle checks.
- Require versions on public draft/submission writes; update existing test fixtures explicitly for the new transport contract.
- Keep receipts bound to the task, payload and committed result. Reopened/corrected records invalidate an old receipt result.
- Never discard local input on failure; loading latest values is explicit.
- Use isolated test data and additive schema changes; do not create live rubrics or tasks.

## Task 1 — Backend write contract

- [x] Add failing regression tests in backend/marks/test_write_reliability.py.
- [x] Add version/fingerprint helpers in backend/marks/write_versions.py.
- [x] Add MarkSubmissionReceipt and an additive migration.
- [x] Update EvaluationTaskSerializer, MarkDraftSerializer and submit_marks_view.
- [x] Verify stale writes, atomic rollback, repeat/changed requests and ownership.
- [x] Add real concurrent draft/submission tests and update prior API fixtures without changing their business assertions.

## Task 2 — Form/service integration

- [x] Test one-request submission and version transport in frontend services.
- [x] Transport writeVersion/expectedVersion and stable submission IDs.
- [x] Add inline draft-conflict recovery while retaining failed input.
- [x] Verify uncertain submission retry keeps its ID and changed input creates a new attempt.

## Task 3 — Acceptance and rollout

- [x] Extend the real HTTP/browser journey with stale-draft and retry coverage.
- [x] Run complete Marks/backend, frontend, browser, TypeScript and build checks.
- [x] Update requirements, architecture and status; check migration drift and whitespace.
- [x] Apply only the new additive Marks migration locally and reload the backend.
