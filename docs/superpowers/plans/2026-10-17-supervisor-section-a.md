# Supervisor Section A Implementation Plan

> **For agentic workers:** Use subagent-driven-development for the backend and form units, with task review and final integration review. User authorized immediate execution; no approval pause, commit, push or separate checkout.

**Goal:** Deliver the digital Section A specified in the linked design, using existing particulars and unchanged appointment decisions.

**Architecture:** An additive, versioned multipart JSON input produces a server-owned submission snapshot. Dedicated authorized prefill/detail endpoints keep sensitive data out of list DTOs. The existing student form and shared request-detail component consume these contracts.

**Tech Stack:** Django/DRF/PostgreSQL, React/TypeScript, existing portal components and Node test runner. No new dependency.

**Spec:** `docs/superpowers/specs/2026-10-17-supervisor-section-a-design.md`.

## Global constraints

- Preserve the existing checkout and unrelated changes; no commits/pushes or live academic decisions.
- Keep Student -> Supervisor -> Coordinator, private upload validation, capacity, programme/delegation, lifecycle, cancellation and replacement semantics.
- Sensitive Section A data is available only via authenticated own-prefill and existing-authorized exact-record endpoint. No list/export expansion.
- New portal always submits version 1; omitted Section A remains an explicit older-client compatibility path with no invented evidence/declaration.
- Apply exact field names, limits and proposal/declaration rules from the design; old records keep null Section A.

### Task 1: Backend submission record and authorized APIs

**Files:** appointments `section_a.py`, `section_a_views.py`, `models.py`, next migration, `serializers.py`, `views.py`, `urls.py`, `test_section_a.py`.

**Interface:** the two GET endpoints and multipart `sectionA` JSON specified in the design; no changes to existing list serializer contracts.

- [x] Write API tests first and run them failing on absent endpoints/record. Reuse synthetic workflow fixture; use task-specific test DB.
- [x] Add nullable JSON model field/migration, resolver, strict input validation and authoritative capture in the existing transaction.
- [x] Enforce the conditional existing proposal requirement after normal secure document validation. Preserve older-client compatibility and all global requirements.
- [x] Add owned-prefill and scoped exact-record endpoints, test privacy/missing registry/stability and approval continuity; run targeted suites and migration checks.

### Task 2: Student form and client contract

**Files:** new `types/supervisorSectionA.ts`, `services/supervisorSectionAApi.ts`, `utils/supervisorSectionA.ts`, form section components; modify `SupervisorAppointmentApplicationPage.tsx`, `utils/supervisorDocuments.ts`; focused tests.

**Interface:** types mirror Task 1 JSON, `getSupervisorApplicationPrefill()` and `getSupervisorApplicationSectionA(id)` use existing apiClient. Multipart helper appends JSON using `JSON.stringify`; never send particulars as writable identity fields.

- [x] Write failing rendered/form-data/validation tests covering the missing sections and declaration/proposal cases.
- [x] Load prefills with loading/error/retry states; show read-only source data and truthful missing-data guidance.
- [x] Add courses/results, title-origin and review/declaration controls with accessible labels, existing portal styles, new dirty guards and fresh declaration for replacements.
- [x] Preserve all candidate/upload/intake/error behavior. Submit only validated version-1 Section A and keep draft after failure. Run tests and TypeScript.

### Task 3: Shared exact-record display and integration

**Files:** new `SubmittedSupervisorSectionA.tsx` and tests; modify `SupervisorRequestDetail.tsx`, `AppointmentRequestSections.tsx`; all three root governance documents.

- [x] Write failing tests for snapshot-based particulars, results/declaration, loading/retry/legacy display and blank course-code fallback.
- [x] Fetch exact Section A by application identity in the shared detail path. Use snapshot values in summary and show remaining particulars, results, title origin and declaration consistently across roles.
- [x] Review backend/form tasks against the design and fix integration defects. Primary agent completed final source/integration review; a separate final helper review was unavailable after helper usage limits.
- [x] Run affected backend and frontend regressions, full frontend scripts, TypeScript/build, Django checks/migration checks and whitespace checks.
- [x] Update PROJECT_REQUIREMENTS, ARCHITECTURE_AND_CODING_DESIGN and PROJECT_STATUS with implemented scope, compatibility path and actual verification/limitations; complete this checklist.

## Rulings / progress

- 17 October: work in the existing authorized feature checkout to preserve the latest uncommitted portal work. A new worktree would omit that required baseline.
- Interface scan: backend produces both endpoint payloads consumed by the form/client and exact detail. Only Task 1 edits backend; Task 2 owns client types/services/form/helpers; Task 3 owns shared request detail and governance docs. Common interface fixed by the design. No competing file ownership.
- The new versioned contract deliberately retains omitted-section compatibility for older clients; malformed provided sections must fail. New UI cannot omit the section. This avoids retroactive declaration claims and breaking existing consumers.
- Completed: 96 affected backend tests, all 207 frontend checks across 164 file entries, TypeScript/build, Django checks/migration dry-run and task whitespace checks. Migration 0017 applied locally; all seven historical applications retain null Section A. Synthetic browser checks cover failed-submit preservation, fresh confirmation after edits, conditional proposal and course controls; clean form at 390px has no page overflow. No real academic submission/decision, commit or push.
