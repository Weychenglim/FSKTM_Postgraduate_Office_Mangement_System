# Office Supervisor Replacement Implementation Plan

> **For agentic workers:** Use subagent-driven-development for backend implementation and review; the primary agent integrates the frontend and documentation in this existing checkout. Steps use checkbox syntax for tracking.

**Goal:** Office Staff initiate exceptional primary Supervisor replacements from View supervision; Students retain initial applications and tracking.

**Architecture:** Add an Office-only context/create endpoint which creates the existing SupervisorApplication replacement and records its Office SUBMIT actor. Reuse Supervisor acceptance, Coordinator approval and transactional handover. Mount a dedicated RecordPage form from the current Appointment record card. Preserve all existing unrelated changes in this checkout.

**Tech Stack:** Django/DRF/PostgreSQL, React/TypeScript, existing portal components and API client.

**Spec:** User-approved conversation design of 2026-10-19; the Office-only initiation rule supersedes PROJECT_REQUIREMENTS.md's older Student replacement rule.

## Global Constraints

- No change to first applications, final approval authority, private evidence, active Panel continuity or historical Marks.
- Current Supervisor remains active until final approval; rejected/cancelled attempts never end the incumbent.
- Office supplies a candidate and mandatory reason. Research comes from the server's current profile; no student declaration or reused immutable evidence is fabricated.
- Preserve semester/intake, participant eligibility, no pending transfer, role separation, workload and duplicate guards under locks.
- Student direct replacement submissions and cancellation of Office-origin requests must fail; role checks are enforced by the server.
- Reuse the exact portal typography, RecordPage/draft guards, PortalSelect, PortalButton and status wording. No global CSS/dependency changes.
- Work in the existing codex/portal-consistency-and-toast checkout: required uncommitted dependencies are already here and are served locally. No worktree migration, commits, pushes, database fixture changes or live academic submissions.

## Task 1: Office creation and immutable provenance

Files: backend/appointments/supervisor_replacement.py (new), urls.py, serializers.py, views.py, co_supervision.py and focused test files. Existing helpers/services may receive minimal corrections required to preserve handover.

- [x] Add failing API tests for Office-only context/create; Student direct submission denial, duplicate/stale/invalid inputs, non-Office access, Office actor and no Section A; Student cancellation denial and incumbent continuity through acceptance/final approval.
- [x] Run focused tests against unique isolated test database using backend/.env.local-supervisor-form-tests.py; confirm intended failures.
- [x] Implement GET/POST `/appointments/supervisor/appointments/<pk>/replacement/`. Strict POST `{proposedSupervisorId, reason}`; GET returns authoritative current appointment/student/research/candidate facts, canSubmit, blockedReason and pendingApplicationId. Return existing SupervisorApplication response on POST.
- [x] Record SUBMIT with the Office actor and reason. Expose initiatedByOffice; do not infer a Student declaration from an Office request. Add exact-team canChangePrimarySupervisor and pendingPrimaryReplacement capabilities.
- [x] Preserve existing creation and final-approval checks under current lock order; notify proposed Supervisor with accurate Office attribution. Update superseded Student-replacement tests without discarding their handover assertions.
- [x] Run focused API, handover, Section A and workflow regressions; Django/migration checks. Review code and boundary conditions.

## Task 2: Role-specific portal entry and replacement form

Files: frontend/src/components/StudentSupervisorAppointment.tsx, StudentAppointmentGuidance.tsx, SupervisorAppointmentApplicationPage.tsx, SupervisoryTeamManagement.tsx, OfficeSupervisorReplacementForm.tsx (new), SupervisorRequestDetail.tsx, shared types/API/workflow helpers and focused tests.

- [x] Add UI/API tests covering no Student replacement action, Office-only action from exact supervision, explicit candidate/reason, pending replacement display, Office attribution and absence of Student declaration instructions.
- [x] Remove Student replacement button, route prefill state and guidance. Preserve ordinary application form and history; deny student form prefill for an active incumbent server-side.
- [x] Add typed Office context/create API helpers and a dedicated guarded RecordPage form. Load context for the exact appointment; show disabled candidate states, required reason and server feedback; preserve drafts on failures and prevent double submit.
- [x] Show Change supervisor only from authorized exact Office Appointment record, retain End appointment separately, and display pending replacement rather than another creation action. Reload after success without allowing repeat creation if the refresh fails.
- [x] Reflect initiatedByOffice across shared adapters/detail/progress and cancellation checks. Existing Student/legacy records remain honestly labelled.
- [x] Run focused frontend tests, TypeScript, production build and browser checks for Student/Office/Coordinator/lecturer role visibility and mobile fit without live submissions.

## Task 3: Review and delivery

- [x] Independently review permission, stale-state, request provenance, declaration and continuity behavior; resolve findings and rerun affected checks.
- [x] Update PROJECT_REQUIREMENTS.md, ARCHITECTURE_AND_CODING_DESIGN.md and PROJECT_STATUS.md with actual verification, superseding conflicting historical wording.
- [x] Restart the existing local backend as needed, verify frontend proxy/API health and save screenshots for the final result.

## Rulings and progress

- Ruling: Preserve existing intake checks for exceptional replacements; the user approved Office initiation, not bypassing published submission windows.
- Ruling: Reuse immutable workflow actor_role for provenance rather than introducing a new database field. Historical Student replacements remain historical; no academic records are rewritten.
- Ruling: Carry forward current research without accepting a student declaration on their behalf; Office replacement uses section_a=null and explicit Office provenance.
- Backend task delegated; frontend integration and documentation owned by primary agent. No shared-file edits between implementers.

- Ruling: new Office requests fail when their exact predecessor is ended during review; legacy Student-created replacement approval semantics and already-approved retries remain compatible.
- Review correction: use one locked, case-insensitive owned-profile resolver at Office initiation and final handoff; reproduced legacy casing duplication is fixed and covered with active Panel continuity.
- Complete: 235 frontend checks and 131 backend tests pass; TypeScript/build/system/migration checks pass; independent frontend review and backend re-review clean. Browser Student/Office/Coordinator role checks, draft navigation and 390px fit verified without academic mutations.
