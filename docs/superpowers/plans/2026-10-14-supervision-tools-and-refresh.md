# Supervision tools and refresh removal implementation plan

> **For agentic workers:** Use task-specific workers for independent backend exports and refresh controls; integrate and verify in this session. User approved execution with “roast three plans for the improvement, then go”.

**Goal:** Simplify secondary Office tools, export current student–lecturer supervision mappings and remove manual Refresh controls throughout the five owned modules.

**Architecture:** Reuse authenticated binary download APIs and existing scoped team browse filters. Generate both workbook views on the server from ACTIVE appointments; keep exports beside current team lists and selected lecturer lists. Preserve mutation reloads, loading error Retry and draft protection.

**Tech Stack:** React/TypeScript, Django, existing XLSX dependency and portal primitives.

**Spec:** Approved conversation design: grouped Tools with descriptions; Document requirements separated as configuration; Capacity reassessments unchanged; contextual XLSX with Students by lecturer and Supervisors by student sheets.

## Constraints

- Owned modules: Dashboard/Timeline, Supervisor Appointments, Panel Appointments, Marks and Workflow/Approval Tracking, including their governed dependencies.
- Preserve current dirty branch work, role authorization, automatic post-save loads, retries, CSV history/attention exports and draft protection.
- No new dependencies, database migration, academic decisions, commit or push.
- Workbook filters match team browse and cover every result, independently of UI pagination. Student sheet shows complete current teams for matched students; lecturer sheet shows matching assignments.

## Task 1: Refresh controls

- [x] Remove manual refresh controls from all owned role and nested surfaces; retain underlying loaders and error recovery.
- [x] Update affected rendering expectations and verify draft-safe refresh/closure behavior.

## Task 2: Scoped supervision workbook

- [x] Add failing permission, relationship, filter and formula-safety XLSX tests.
- [x] Add guarded Office/Coordinator binary endpoints and bounded-query workbook generation from ACTIVE primary/supporting appointments.
- [x] Run scoped export and browse regressions.

## Task 3: Tools and contextual download

- [x] Verify authenticated download sends complete filters, ignores UI pagination and never saves failed responses.
- [x] Group described Office tools; move supervision downloads to current team and selected lecturer card headers.
- [x] Verify menu accessibility, viewport bounds, role scopes, download labels and error handling.

## Task 4: Integration and documentation

- [x] Review worker diffs, run affected frontend tests, TypeScript/build, Django checks and whitespace checks.
- [x] Verify actual Office menu and workbook download in browser when local servers are available.
- [x] Update PROJECT_REQUIREMENTS.md, ARCHITECTURE_AND_CODING_DESIGN.md and PROJECT_STATUS.md with final behavior and actual evidence.
