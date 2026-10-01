# Carryover Capacity Reassessment Implementation Plan

> **For agentic workers:** Use subagent-driven-development to implement the independent backend and interface tasks, followed by integration review.

**Goal:** Office can authorize a pending closed-semester appointment request to be assessed against the current active semester's capacity without rewriting the request or bypassing workload limits.

**Architecture:** Appointments owns per-request authorization and immutable history. The existing Supervisor, co-supervisor and Panel decision paths resolve their capacity semester through one shared service. The existing supervisory-team screen exposes Office controls and scoped staff history.

**Tech Stack:** Django/PostgreSQL, React/TypeScript; existing dependencies only.

**Spec:** User-approved design in this conversation on 2026-09-29; rules reproduced below.

## Constraints and decisions

- Original semester, request, documents and approval stage are unchanged. This is capacity reassessment, not approval or additional capacity.
- Only Office Staff/Admin may grant/revoke with a reason. Only pending requests originating in Closed semesters qualify; archived records stay locked.
- Grant targets the current effective Active semester. Final approval resolves its current Published plan and rechecks capacity, availability, eligibility and existing appointment conflicts.
- An authorization becomes unusable when its target semester ceases to be effective/Active. Office may replace it through another audited grant. Final approval records the policy actually used.
- Preserve global workload counting, Panel reservation self-exclusion, supporting position limits and replacement semantics. Never change Marks generation behavior.
- Consistent Student/request/Lecturer locks serialize authorization and decision operations. Stale stage/semester inputs return 409.
- No automatic commit, push or deployment is included in this feature slice.

## Task 1: Backend records and enforcement

- [x] Add authorization/history models and additive migration in Appointments.
- [x] Add `capacity_reassessment.py`, scoped API views/URLs and Office-only grant/revoke services.
- [x] Integrate the shared capacity-semester resolver in Supervisor, Panel and co-supervisor acceptance/final approval paths.
- [x] Add focused tests: closed vs archived/active, grant/revoke/replacement, changed active semester, original history preserved, current capacity/availability enforcement, Panel reservations, permissions and stale decisions.

## Task 2: Existing-screen interface

- [x] Add typed capacity reassessment contracts and API methods.
- [x] Add a reusable section to existing supervisory-team screens; Office can inspect original/current policy and grant/revoke with reason, authorized coordinators can inspect history.
- [x] Test role controls, readable status/semester labels and stale-action refresh.

## Task 3: Integration and verification

- [x] Review backend locking, eligibility and privacy; verify UI matches actual contracts.
- [x] Update PROJECT_REQUIREMENTS.md, ARCHITECTURE_AND_CODING_DESIGN.md and PROJECT_STATUS.md with actual results.
- [x] Run focused backend tests, all affected frontend scripts, Django/migration checks, lint/build/artifact guards, and an isolated browser walkthrough where possible.
- [x] Independent final review; resolve substantive findings and report remaining limits honestly.

## Completion evidence (2026-09-30)

- 573 backend regression tests passed; 2 final focused checks passed separately.
- 58 frontend scripts passed, with final affected tests/lint/build/guards rerun after the event-token fix.
- Django system checks, migration-drift checks and diff whitespace checks passed.
- Local migration applied; 44 existing academic model fingerprints unchanged.
- Independent review findings resolved. Browser initialization timed out; browser acceptance remains unverified.
- Work remains uncommitted on `codex/carryover-capacity`.
