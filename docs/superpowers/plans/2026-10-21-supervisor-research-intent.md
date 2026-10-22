# Supervisor Research Intent Implementation Plan

> **For agentic workers:** Use test-first implementation with independent backend/frontend ownership and a final independent review. Work in the existing user-authorised branch; preserve all pre-existing changes. No commit, push or unrelated refactor.

**Goal:** Require structured Research Intent in every new student Supervisor application and support saved text drafts and authorised review.

**Architecture:** Add a nullable application snapshot and a separate owner-only draft model. Reuse existing application creation and exact-record authorisation. Replace the current single long form with four steps and add shared intent fields/read view; retain all existing shared fields and approval rules.

**Tech Stack:** Django/DRF, React/TypeScript, existing portal primitives, Node test/tsx and Django TestCase.

**Spec:** `docs/superpowers/specs/2026-10-21-supervisor-research-intent-design.md`

## Global Constraints

- Research Intent is required for every new student application. Existing records remain nullable; Office replacement never asks a student to resubmit.
- Nine required plain text values, 10,000 characters each, strict version 1 schema; no invented content.
- Title, area, short abstract, student particulars and supervisor have one source each.
- Keep approval, intake, capacity and secure uploads unchanged; no sensitive list expansion.
- Drafts are per authenticated student, incomplete text/choices only, no declaration/files/capacity/workflow; clearly explain reselecting files.
- Four steps, no nested tabs, explicit final submit, correct validation/focus and mobile layout.

## Task 1: Backend snapshot, validation and drafts

Files: `backend/appointments/{models,serializers,views,urls}.py`; new `research_intent.py`, `research_intent_views.py`, additive migration, tests; existing test creation payload fixtures as required.

- [x] Write failing API tests for missing/invalid intent and owner-only incomplete draft persistence; run on isolated DB and observe expected failure.
- [x] Implement the exact contracts from the spec, atomic final-submit cleanup and exact-view authorisation reuse.
- [x] Update successful creation fixtures to include real synthetic intent; run affected appointment tests, Django checks/migration drift. Report commands/results and changed files.

## Task 2: Four-step frontend and submitted view

Files: `frontend/src/components/SupervisorAppointmentApplicationPage.tsx`, `SupervisorSectionAFormSections.tsx`, `SupervisorRequestDetail.tsx`, `frontend/src/utils/supervisorDocuments.ts`; new focused intent/draft types, API, utility, editor/view components and tests.

- [x] Write failing tests for schema, validation, multipart field, four steps and legacy read rendering; verify failures.
- [x] Implement typed contracts, nine-field editor and read view, four-step progression/current-step validation, full review, draft save/resume/discard and existing guarded submission.
- [x] Preserve uploads/contact/course editing/security behaviour, clear declaration on every substantive edit; test saving/error/invalid selection/late load.
- [x] Run affected tests and TypeScript, then report files and commands/results.

## Task 3: Integration, review and evidence

- [x] Independently review the combined change for required enforcement, snapshot immutability, private exact-view access, draft/save/submit races, step validation, legacy and Office replacement compatibility.
- [x] Apply additive migration locally after checking migration plan; run related/full tests, TypeScript and build, then inspect student/reviewer and narrow layout with no academic decisions.
- [x] Update `PROJECT_REQUIREMENTS.md`, `ARCHITECTURE_AND_CODING_DESIGN.md`, `PROJECT_STATUS.md` and this plan with verified results and any material limits.

## Completion evidence

All 444 affected backend tests and all 36 mounted browser scenario runs pass. TypeScript, production build, Django checks/migration drift and scoped whitespace pass. Full frontend suite: 286/287 pass; unchanged RegistryDropdowns source assertion expects the earlier SelectMenu literal prop and is recorded as inherited. No test was disabled or excluded. Final screenshots/logs are in `output/research-intent-20261021/`; authenticated live-browser writes and native OS keyboard traversal were not performed. No commits or pushes.
