# Appointment filter consistency implementation plan

**Goal:** Apply the agreed useful Office/Coordinator filters and give every existing Lecturer/Student appointment filter card a consistent Clear filters action without redesigning its layout.

**Architecture:** Add one presentation-only WorkspaceFilterCard alongside WorkspaceFilterActions. RequestFilters, CoordinatorFiltersBar, PanelBrowse and the Lecturer Panel supervisee roster compose it with their existing fields and layout. Controllers own atomic resets and role scope. Keep the Rubrics-specific FilterCard separate.

**Technology:** React, TypeScript, existing PortalSelect/PortalButton, URLSearchParams and ListState; no dependency/API/schema changes.

**Approved scope:** This conversation's latest Office/Coordinator field agreement and explicit request to plan, critique twice and implement. Earlier proposals to enlarge search or move sorting are rejected.

## Constraints and critique

- Preserve the existing compact card, typography, grid/flex arrangement, navigation and footer/export placement. No collapsed filters or extra toolbar.
- Office retains cross-programme monitoring; Coordinator retains managed/delegated programme and decision scope. Keep semester, useful status choices, useful sorting, Supervisor request type and one accurately labelled lower-bound date. Remove upper-bound dates in appointment lists, clearing their effect in remembered/URL filters, reads, exports and drilldown.
- Lecturer and Student retain their smaller existing field sets. Always show Clear filters on an existing filter card, including search-only cards. Student Panel is a single-record overview and gets no invented filter card.
- Reset only list filters/page, preserving Requests/History, page size, route/source context and academic data. Multi-field URL resets must use one setter call. No programme dropdown is removed based on today's result count.
- Critique 1: lookalike containers permit missing actions; use a shared container/footer rather than copy-pasted buttons.
- Critique 2: hidden saved bounds and partial resets can contradict the UI; normalize removed fields and verify actual interaction state, not just markup.

## Tasks

- [x] Add failing regression checks for shared cards/Clear filters, atomic query resets and single-bound staff filters.
- [x] Add WorkspaceFilterCard and a scoped query-reset helper; migrate RequestFilters, CoordinatorFiltersBar, PanelBrowse and PanelSuperviseeRoster while retaining their field arrangements.
- [x] Wire Student/Lecturer multi-field URL resets atomically. Ensure remaining RequestFilters consumers reset their supplied fields, including request type, selected student and page where applicable.
- [x] Remove appointment upper-bound controls and ignore their saved values consistently in staff requests, history, Panel filtering/exports and drilldown. Preserve accurate Submitted/Outcome/Started/Ended lower-bound labels.
- [x] Run scoped component/helper regressions, mounted desktop/mobile reset/date/export/return checks, TypeScript, build and whitespace checks. Inspect rendered desktop/mobile layouts.
- [x] Update all three root governance documents with final scope, evidence and limitations.

## Files

- RequestWorkspacePrimitives.tsx: shared card/footer, RequestFilters reset contract.
- utils/appointmentFilters.ts: pure query reset preserving view/source/page-size state.
- CoordinatorBrowsePrimitives.tsx, CoordinatorSupervisorWorkspace.tsx: configurable date bound and normalized browse parameters.
- PanelBrowse.tsx, PanelAssignmentsWorkspace.tsx, PanelSuperviseeRoster.tsx: shared card and appropriate local reset/date handling.
- StudentSupervisorApplications.tsx, LecturerAppointmentRequests.tsx, ResearchAmendments.tsx: atomic reset callbacks.
- AppointmentFilterLayout.test.tsx and mounted appointment fixture/runner: behavioural and visual regression coverage.
- Root requirements, architecture and status documents: accepted contract and verification.

## Completion evidence

The new single-bound/shared-card assertions failed before implementation, then passed. Fourteen scoped component scripts plus the query-reset helper, 32 mounted scenarios at 1280px/390px, TypeScript, build and whitespace checks pass. Removed upper-bound memory cannot narrow Panel rows or Excel exports. Actual Student and Lecturer request reset handlers preserve History, page size and source. Desktop/mobile staff screenshots were inspected. Browser scenarios use mocked read APIs and make no academic mutations. The existing ExcelJS bundle-size advisory remains. Changes remain local and uncommitted.
