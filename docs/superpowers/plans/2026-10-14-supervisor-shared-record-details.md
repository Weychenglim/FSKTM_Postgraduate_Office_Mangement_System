# Supervisor shared record details implementation plan

> **For agentic workers:** Use task-specific workers for disjoint shared foundation, research presentation and primary request integration; integrate and verify in this session.

**Goal:** A consistent record-detail experience across all authorized Supervisor roles, with reusable approval presentation.

**Architecture:** Retain current API/scoping and mutations. Normalize authorized payloads into shared presentation contracts, using immutable workflow events and status-specific stage definitions. Add a metadata slot to existing RecordPage; preserve guards and return context.

**Tech Stack:** React/TypeScript, portal primitives, Lucide, existing date utilities. No dependency changes.

**Spec:** `docs/superpowers/specs/2026-10-14-supervisor-shared-record-details.md`.

## User feedback correction (14 October, supersedes initial completion)

- [x] Remove visible reference/copy metadata, raw audit enums and irrelevant transfer acknowledgements.
- [x] Remove comparison boilerplate and repeated missing-history placeholders; preserve historical facts.
- [x] Share actual appointment and exact-student supervision renderers across staff roles, retaining authorized actions/data.
- [x] Match primary/research typography through shared field/body styles and move profile navigation to the summary header.
- [x] Add equivalence/capability regressions, including the real Lecturer Active status and current appointment identity.
- [x] Verify the same student in Office, Coordinator and Lecturer views; inspect primary/research computed typography and desktop/320px card placement.
- [x] Run all 131 frontend scripts, TypeScript, production build and whitespace checks after final fixes.

No academic decisions made, commit/push performed or independent final clearance claimed. Existing backend scopes and mutations retained. Older task completion did not establish visual consistency; this correction is the current implementation evidence.

## Constraints

- Preserve dirty branch, role scope, capabilities, document downloads, drafts, list filters and exact identities.
- Do not add Coordinator research approval, Student supporting nomination visibility, or fictional historical decisions/timestamps.
- Capacity placement/policy and Panel UI remain unchanged.
- Keep primary/supporting request approval separate from appointment endings and profile corrections.

## Task 1: Shared workflow presentation

Files: new `utils/approvalProcess.ts`, `components/ApprovalProcess.tsx`, `components/RequestDetailPrimitives.tsx`, tests; parent adds `RecordPage.metadata`.

- [x] Write/run failing cases for primary/supporting/research/transfer status progression, terminal outcomes, missing events and legacy Coordinator research.
- [x] Implement normalized steps, generic visual process, metadata/card/section and audit disclosure contracts from spec.
- [x] Verify chronology, unknown actors/times, cancelled/not-reached, accessibility and Malaysia timestamps.

## Task 2: Research details and snapshots

Files: `ResearchAmendments.tsx`, `StaffResearchWorkspace.tsx`, new `RequestedChangesComparison.tsx`, affected tests.

- [x] Reproduce inconsistent role structure and ambiguous comparison labels.
- [x] Unify authorized detail rendering, lift metadata out of content, preserve actions/reasons/team snapshots and profile revisions.
- [x] Verify pending/approved/rejected/cancelled/transfer and actual submission attribution for all roles.

## Task 3: Primary details across roles

Files: new `SupervisorRequestDetail.tsx`, Student/Lecturer/Coordinator appointment detail renderers, optional Student presentation fields/types/map, affected tests.

- [x] Reproduce missing shared primary process and differing details.
- [x] Normalize role-authorized payloads into one summary/content/documents/progress/actions/audit structure.
- [x] Preserve accept/approve/reject/cancel and existing dirty/busy/stale-record protections.

## Task 4: Supporting, Office and historical/team integration

Files: Office workspace/legacy management, SupervisoryTeamManagement, shared supporting content, paged supporting history.

- [x] Add shared metadata/header slot without changing RecordPage guards.
- [x] Use shared primary content for Office; retain real administration/lifecycle fields in secondary sections.
- [x] Align staff supporting requests, team details and ended appointments; preserve Student nomination privacy and actual lifecycle audit.
- [x] Inspect forms/tools/profile framing, make only needed consistency adjustments.

## Task 5: Validation and handoff

- [x] Review of workflow truthfulness, capabilities, snapshots and identity/draft boundaries. Initial independent findings fixed; primary agent completed integration review because the reviewer reached the account usage limit before final clearance.
- [x] Run affected/full frontend scripts, TypeScript and build; scoped backend regressions if adapters change payload expectations.
- [x] Verify desktop/mobile request, research and history pages in browser without academic mutations; save previews.
- [x] Update requirements/design/status/handoff with final behavior, scope and actual evidence.
