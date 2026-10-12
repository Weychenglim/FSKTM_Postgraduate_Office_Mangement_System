# Supervisor Role Hierarchy Implementation Plan

> Execute with subagent-driven-development in the current session; retain the user's existing branch and uncommitted changes.

**Goal:** Consistent Supervisor list hierarchy across all four roles without removing role-specific workflows.

**Architecture:** Reuse PageHeader, SupervisorWorkspaceNavigation, RequestWorkspacePrimitives and RecordPage. Extract/use role-appropriate request list projections while authoritative loaders/mutations remain in their containers. Separate Office/Coordinator teams and research from primary lists; add an independent scoped Coordinator history endpoint.

**Tech Stack:** React 19, TypeScript, React Router, existing Tailwind/CSS primitives, Django REST framework.

**Spec:** docs/superpowers/specs/2026-10-12-supervisor-role-hierarchy.md

## Constraints

- Existing Inter and data-table typography only; no dependencies/schema changes.
- Retain primary/supporting/transfer/correction/lifecycle capabilities and route/draft guards.
- History lists terminal requests; active/ended appointments remain team lifecycle records.
- No live workflow mutations and no commit/push/merge. Root documents owned by the controller.

## Task 1 — Student application workspace

Files: StudentSupervisorApplications.tsx, StudentSupervisorAppointment.tsx and a new StudentSupervisorApplications.test.tsx.

Interfaces: reuse RequestViewSwitch, RequestFilters, WorkspacePagination, requestStatusLabel and requestWaitingDays. WorkspaceRecordTable will accept optional identityLabel for the first column (default Student). Shared research wrapper will accept role and default to Lecturer; controller integrates Student research if needed.

- [x] Add loaded fixture assertions that ongoing/history are separate, identifiers are not headlines, supervisor leads rows, stage/wait are separate and more than ten results paginate.
- [x] Run `node --import tsx src/components/StudentSupervisorApplications.test.tsx` and confirm intended failures.
- [x] Replace full Applications cards with compact responsive table/filter/view/pagination; preserve compact current-request overview and supporting history, keep local/query state on return.
- [x] Add one owning Refresh and disable redundant child refresh; protect open drafts/busy work. Preserve new/replacement actions and detail routes.
- [x] Run affected tests and TypeScript; self-review permissions and retained actions.

## Task 2 — Coordinator requests and history

Files: CoordinatorSupervisorApprovals.tsx; appointmentsApi.ts; backend appointments views.py, urls.py and dedicated history test. Controller owns App/navigation integration and root docs.

Interfaces: component gains optional workspaceView ('requests'|'teams'), refreshVersion, showHeader, onBusyChange. Default keeps standalone Supervisor header. onNavigateToApplication existing callbacks remain. Shared navigation role accepts Programme Coordinator and routes teams to supervisorAppointmentSupervisees.

- [x] Add backend tests: approved/rejected/cancelled included, pending excluded, unrelated roles/programmes excluded, effective coordinator scope preserved.
- [x] Add separate `/appointments/supervisor/coordinator-history/`; leave coordinator-records contract unchanged.
- [x] Add fixture rendering tests for compact queue/history with one Review/View action and no inline comparison/decision buttons.
- [x] Render header/navigation, Requests/History, search/type/status filters and pagination using existing primitives. Keep decisions/docs/progress only in dedicated record pages. Preserve supporting decisions and primary appointment lifecycle records in appropriate sections.
- [x] Run affected Django/frontend tests and self-review scope/terminal history/record return.

## Task 3 — Shared navigation, research and Office hierarchy

Files: SupervisorWorkspaceNavigation.tsx, supervisorWorkspace.ts, RequestWorkspacePrimitives.tsx, LecturerResearchWorkspace.tsx, ResearchAmendments.tsx, StaffResearchWorkspace.tsx, App.tsx, SupervisorAppointmentManagement.tsx, SupervisoryTeamManagement.tsx and focused tests.

- [x] Add role navigation/table tests before extending links to Office/Coordinator and identityLabel to WorkspaceRecordTable.
- [x] Generalise the controlled research wrapper to accept role; lists partition ongoing/history for every role and share header/filter/table/pagination. Preserve profile/new links and permission-specific actions.
- [x] Route Office/Coordinator teams and research through the common Supervisor heading/tab hierarchy; detail routes retain independent RecordPage and validated return.
- [x] Remove embedded team/research blocks from Office appointment list; add one Refresh, common section/filter/pagination styling, descriptive View actions and existing administrative tools in their relevant sections. Preserve status/programme/semester/export/workload/lifecycle controls.
- [x] Keep teams' existing capability-specific management available; separate research and use shared paging controls. Preserve no-supervisor appointment rows.
- [x] Run affected regressions and TypeScript; inspect mobile overflow and role-specific list restoration.

## Task 4 — Integration, review and evidence

- [x] Review combined changes for feature loss, permissions, stale drafts and route loops; fix findings and rerun affected checks.
- [x] Run every frontend regression script, TypeScript, production build and security/artifact guards; run affected backend history/lifecycle/delegation tests and Django check.
- [x] Browser-check all four roles and representative narrow screens without submitting mutations. Save previews and restore Lecturer workspace.
- [x] Update PROJECT_REQUIREMENTS.md, ARCHITECTURE_AND_CODING_DESIGN.md, PROJECT_STATUS.md and this checklist with exact evidence/limits; final diff whitespace check.

## Rulings and progress

- Existing requested branch contains the prior authorised implementation. Reuse it; a new checkout would omit the design being extended.
- Implement Student and Coordinator in separate file-owned tasks; controller handles shared/Office integration. Do not edit another owner's files.
- Preserve coordinator-records as approved appointment data; add terminal request history separately.

- Completed: 93 frontend scripts, 33 affected backend tests, final affected rendering/TypeScript/build/security guards, Django/migration checks, scoped review and representative browser checks. See PROJECT_STATUS.md for dataset limits.
