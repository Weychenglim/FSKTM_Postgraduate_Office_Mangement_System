# Office Dashboard UX implementation plan

> Execute the approved proposal in focused tasks. Use subagent-driven-development for independent page work and review; preserve the existing working tree without commits or resets.

**Goal:** Make Office Dashboard navigation and priorities clear while preserving academic behavior and protected participant/delegation areas.

**Architecture:** Add opt-in Office presentation and local navigation; keep existing APIs and guards. Separate operational periods into an Office-only route and maintain old entry links. Existing pages keep their service owners.

**Tech stack:** React, TypeScript, existing Tailwind/portal primitives, Django read services unchanged.

**Spec:** `docs/OFFICE_DASHBOARD_UX_ENHANCEMENT_PLAN_2026-10-20.md` (twelve critical review passes).

## Constraints and execution rulings

- User authorised implementation after the audit on 20 October 2026.
- Work in the current `codex/portal-consistency-and-toast` checkout: it contains extensive concurrent uncommitted work required by the live UI. Do not reset, stash, move or commit that work. This overrides creating a clean checkout that omits it.
- Freeze participant/delegation components, APIs, route permission branches and data, shared component defaults, global CSS and Office sidebar. Keep all existing participant links.
- Baseline copies/hashes are in system Temp `fkstm-dashboard-ui-20261020-baseline`.
- Other roles retain current presentation. CSS must be scoped to explicitly permitted subtrees; portal overlays receive opt-in styles rather than a global rule.
- No academic writes for live browser verification; mounted tests use fictional read APIs.

## Task 1 — Navigation, Overview and deadline ownership (root)

Files: App.tsx, constants/routes.ts, AdministrationDashboard.tsx, TimelineManagement.tsx, OperationalPeriodManagement.tsx; new OfficeDashboard navigation/style/context/period components and pure helpers.

- [x] Write/run regression checks for grouped attention, capped preview semantics, protected navigation exclusion, route guards and old period anchors before implementation.
- [x] Add Overview/Calendar/Periods & deadlines/Reports links and grouped Administration navigation to permitted Office pages only. Keep protected shortcut as-is.
- [x] Replace Office's duplicate attention/feed surfaces with five typed attention groups, separate routine monitoring and a compact P1/P2 preview. Retain correct record links and independent request retry.
- [x] Add `/dashboard/periods`, semester-scoped calendar read and guarded OperationalPeriodManagement. Update Marks callbacks and Timeline owner links; preserve legacy fragments.
- [x] Simplify Calendar to context plus Calendar/Entries/History views; keep existing editors/imports/validation. Separate informational event date changes from operational permissions.
- [x] Run route/helper tests and TypeScript; fix failures before integration.

## Task 2 — Semester, capacity and workload pages (management implementer)

Owned files: AcademicSemesterManagement.tsx, LecturerCapacityManagement.tsx, SupervisorWorkloadMonitoring.tsx, PanelWorkloadMonitoring.tsx; related new local helpers/tests. Do not modify App, primitives, global CSS or documentation.

- [x] Reproduce Supervisor summary/state mismatch with a test, then derive summaries/filtering from authoritative capacity states and distinguish missing limits from zero.
- [x] Show semester list first; create/detail as explicit guarded record views. Preserve closure review and participant shortcut.
- [x] Separate operational Published policy from selected version; add clear limits/availability/history sections and existing bounded history reads, permitted cancellation and explicit eligible source-copy flow.
- [x] Align workload filter/table/paging/detail conventions while preserving existing exports, primary/supporting and active/reserved rules.
- [x] Run scoped tests and report exact coverage/limitations; root owns navigation/context wrappers.

## Task 3 — Reports, reconciliation and Office dossier (records implementer)

Owned files: WorkflowReports.tsx, WorkflowReconciliationCentre.tsx, StudentProgressDossier.tsx; new local helpers/tests. Do not modify App, shared primitives, protected lifecycle component or documentation.

- [x] Reproduce capacity-as-overdue and elapsed-calendar-as-completed presentation with tests.
- [x] Add Office-only structured/paged report views and faculty capacity summary; preserve applied-filter footer/export semantics and other roles.
- [x] Give Reports optional `onOpenDossier?: (studentId: string) => void`; root supplies source-aware App navigation.
- [x] Improve reconciliation human labels, short issue rows, expandable facts/history and owning-tool guidance without changing repair guards.
- [x] Improve Office dossier history disclosure and calendar-specific Ended wording. Keep participant shortcut and StudentLifecycleSummary subtree exactly unchanged.
- [x] Run scoped tests and report exact coverage/limitations.

## Task 4 — Integration, verification and documentation (root)

- [x] Review each task for behavior and scope; fix any actionable findings.
- [x] Mount actual components with mocked read APIs at desktop/390px/320px, including independent failures, large queues, route return and protected exclusion.
- [x] Run affected existing tests, full TypeScript and production build, and inspect real desktop/mobile screenshots.
- [x] Compare frozen hashes, review incremental diffs against session baselines and request independent code review.
- [x] Update the three governance documents and proposal status with implemented behavior, tests and known limits. Leave changes uncommitted for user review.

## Execution evidence and limits

Implemented all four tasks. Full frontend run: 263 passing tests in 185 files. Final correction: 11 passing targeted tests, including a new Marks context regression. Mounted verification: 27 passing cases across 1280px/390px/320px plus five passing management cases. Fresh TypeScript and production build pass, with the existing ExcelJS size advisory. Independent source review identified discarded Marks semester/period context; fixed both entry points and re-reviewed with no remaining findings. Browser cases also verify the explicit Marks-tab fallback does not trap later activity switching.

Compared frozen component/shared-default hashes and App's protected route branch with the saved session baseline. Live Office views and actual Overview screenshot were inspected; screenshot: system Temp `office-dashboard-live-final.png`. Fixture screenshots: system Temp `office-dashboard-{1280,390,320}.png`. This is read-only live verification plus mocked component integration, not full authenticated end-to-end academic mutation acceptance. No backend changes, live academic writes, commits or pushes by this task. Required governance documents updated.
