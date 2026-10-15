# Office Supervisor Attention Implementation Plan

> **For agentic workers:** Use the approved design below, test each task before implementation, and review the final diff against the saved pre-task baseline. Backend and frontend file ownership permits parallel work through dispatching-parallel-agents. Do not commit or push.

**Goal:** Make Needs attention the Office Supervisor Appointments landing page while preserving all existing functions and shared portal presentation.

**Architecture:** Add Office-only summary and compact paged attention projections. Build category-specific attention tables with existing portal controls and authenticated ListState. Root Office route becomes Needs attention; a dedicated requests route retains request/history browsing. Existing exact details and authority remain authoritative.

**Tech Stack:** Django/DRF, React/TypeScript, existing portal primitives, no dependencies or migrations.

**Spec:** User-approved five-pass design in this conversation, refined by the final roast: use actual eligible students and active primary appointments, factual waiting ages, separate student/request/lecturer units, and preserve every administration function.

## Constraints and contracts

- Work on codex/portal-consistency-and-toast and preserve the substantial existing uncommitted work. Baseline stored outside the repo.
- Capacity reassessments remains in its current position and behavior; programme transfers stay in the existing module.
- Student/Lecturer/Coordinator navigation and decisions remain unchanged. Office requires active OFFICE_ADMIN plus is_staff; Technical Administrator has no access.
- GET /api/appointments/office-workspace/attention-summary/ returns {withoutSupervisor,waitingRequests,workloadConcerns}. These counts represent all eligible operational records, not the current table filters; no combined total.
- GET /api/appointments/office-workspace/attention/?category=students|waiting|workload returns the existing BrowsePage envelope (results,total,page,pageSize,pageCount,facets). Size 10/25/50. Filter/count/sort before paging. Dates/ages use existing Malaysia conventions.
- students rows: {id,matricNo,studentName,programme,semester,applicationId,pendingStatus,reason}. Active enabled Student only, no active primary. Primary pending application (if any) distinguishes in_progress from none. Search name/matric; programme/intake semester; status none|in_progress; sort no_request|name.
- waiting rows: {key,id,kind,studentId,studentName,matricNo,programme,candidateName,status,submittedAt,waitingDays,waitingOn}. kind primary|supporting|research|transfer. Eligible active students, current pending stages, no routine Student withdrawals, immutable stage history and effective legacy research review. Search name/matric, programme, workflow semester, type, status; sort waiting|oldest|newest. No new due/overdue or Office decision authority.
- workload rows: {id,lecturerId,lecturerName,department,currentStudents,workloadLimit,capacityState,reason}. Reuse authoritative current-semester capacity resolution, including primary+supporting load. Concerns: Near Limit/Full/Over capacity or missing configuration, explicitly distinguished; never label unconfigured zero limits as Full. Search name/staff/department, status reason, sort name|load. No semester/programme selector that falsely scopes lecturer-wide capacity. Current-semester context displayed.
- Attention cards show three distinct units. Default students. Category tables explain reason/current reviewer and use View student, View request, View workload. Dirty/busy and Back context preserved.
- Main Office tabs: Needs attention (root), Appointment requests (/supervisor-appointments/requests), Supervisory teams (existing route). Do not allow other roles to parse requests as an application ID.
- More tools holds Research records, Workload monitoring, Document requirements, and Export appointment records. Export retains the existing complete matching-record CSV fields, not only a page. Waiting and Past appointments lists also expose contextual export. Remove the Records administration destination only after these functions are reachable.

## Task 1: Correct Office attention projections

Files: create backend/appointments/office_attention.py and test_office_attention.py; modify coordinator_workspace_views.py to add Office-only routes.

- [x] Add failing API tests for never-applied students, primary-vs-supporting membership, pending/rejected/ended distinctions, disabled/deferred/graduated/withdrawn exclusion, mixed request ordering, query validation, capacity accuracy, counts/paging and cross-role access.
- [x] Observe expected failures, implement compact read projections using existing services, run focused tests.
- [x] Verify requests and students are filtered/sliced in SQL and exact record authority remains untouched.

## Task 2: Office UI and navigation

Files: create OfficeSupervisorAttention.tsx, OfficeSupervisorTools.tsx and focused tests; modify OfficeSupervisorWorkspace.tsx, staffSupervisorWorkspaceApi.ts, supervisorWorkspace.ts, constants/routes.ts, App.tsx and recordNavigation.ts as needed.

- [x] Add failing render/navigation/service regressions showing default attention, distinct category columns/actions, three main tabs and preserved tools.
- [x] Implement loaders/types; useCoordinatorFilters/useCoordinatorPage and ListState for separate category context; load summary with version/error protection and show unavailable counts on failure.
- [x] Connect Office root/requests routes and exact details, preserving original source, filters and pages.
- [x] Replace Records administration with More tools; retain full CSV export, workload/profile/requirements navigation and existing exact lifecycle controls. Do not reintroduce entire-record loading on normal browsing.

## Task 3: Integration, review and documentation

- [x] Run affected Office/Coordinator/research/navigation frontend scripts, TypeScript, production build/security checks and focused backend integration tests.
- [x] Review task diff against baseline; fix material findings and repeat only affected checks.
- [x] Live read-only Office attention/category, tools, exact-return and desktop/mobile checks. Do not seed or submit live academic decisions to populate previews.
- [x] Update PROJECT_REQUIREMENTS.md, ARCHITECTURE_AND_CODING_DESIGN.md, PROJECT_STATUS.md and handoff with final behavior and actual validation limits.

## Final review rationale

The primary risk is misleading operational information, not styling. Accurate student absence detection, current-stage waiting and explicit capacity configuration state must precede visual claims. Unassigned students with no application must never be inferred from application-only records. There is no invented deadline, approval, reminder workflow or student-facing nomination disclosure.

Completion evidence: 17 new backend cases, 59 final affected browse cases and 116 earlier broader workflow checks; 18 frontend scripts, TypeScript/build/security checks; read-only Office desktop/mobile/category/return/tool/CSV journeys. Review clear after date/facet and viewport-menu fixes. No academic mutations, commits or pushes.
