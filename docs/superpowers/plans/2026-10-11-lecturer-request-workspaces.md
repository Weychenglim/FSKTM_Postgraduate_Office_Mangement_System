# Lecturer request workspaces implementation plan

> Execute sequentially in the user-requested `codex/portal-consistency-and-toast` branch with the executing-plans workflow. The user approved implementation in chat on 2026-10-11.

**Goal:** Give appointment and research requests separate ongoing/history views, accurate Coordinator tracking and stable navigation.

**Architecture:** Keep three Lecturer destinations: Appointment requests, My supervisees and Research changes. Reuse authorised Django services; combine primary and supporting request summaries in one Lecturer-only component. URL query parameters retain view/search/type/page and research student selection. Existing detail routes and Student/Office/Coordinator presentation remain supported.

**Tech stack:** React 19, React Router, TypeScript, Django REST Framework and existing portal styles. No dependencies or schema changes.

**Approved design:** Requests includes actionable and ongoing records; History contains final outcomes only. Distinguish lecturer acceptance from final approval. Supporting appointment activity remains separate. Primary and supporting reviews use panels with existing authorised actions. Research details keep their own route and contextual Back below navigation. Waiting ages are calendar days without estimated completion dates.

## Task 1: Correct primary progress metadata

Files: `backend/appointments/views.py`, `backend/appointments/test_supervisor_workflow.py`, `frontend/src/types/appointment.ts`.

- [x] Add a regression for accepted requests returning `status=PENDING_COORDINATOR`, `decision=Pending Approval`, primary decision timestamps and waiting metadata; also verify Coordinator rejection and role/record scoping.
- [x] Run `.venv/Scripts/python.exe backend/manage.py test appointments.test_supervisor_workflow --keepdb` and confirm the new assertion fails before editing production code.
- [x] Add explicit actual-status/decision projection and application identifiers to the existing assigned-Lecturer history endpoint. Preserve legacy summary fields and API authorization.
- [x] Rerun the affected backend suite.

## Task 2: Separate and combine Lecturer request views

Files: new `frontend/src/utils/lecturerRequests.ts`, new `frontend/src/components/RequestWorkspacePrimitives.tsx`, new `frontend/src/components/LecturerAppointmentRequests.tsx`; existing Lecturer container, navigation, research components, App callbacks and related tests.

- [x] Test real partitioning of own-action, Coordinator-pending, other-ongoing and terminal records, including cancel-only supporting nominations. Add populated rendering checks and Lecturer-specific navigation/header assertions.
- [x] Run the new frontend regression and confirm failures for the missing behaviours.
- [x] Implement `requestGroup(status: string, canDecide: boolean)` and URL-backed filters. Combine primary queue/history and deduplicated supporting nominations. Review counts exclude cancel-only, ineligible and Coordinator-pending records.
- [x] Render both types with the same list/review-panel interaction. Retain supporting accept/reject/cancel confirmation, primary documents/audit, retries, duplicate-submit guards and stale-response protection. Show recorded progress on read-only pending and final records.
- [x] Split Lecturer research into Requests/History with current-stage badges and recorded events. Retain research profiles and contextual profile access; preserve Student and embedded staff consumers.
- [x] Keep one stable module heading, contextual detail heading/Back below navigation and preserve view/search/page/student query parameters on detail and return links.
- [x] Run affected frontend rendering/route/contract regressions and TypeScript.

## Task 3: Verify and document

- [x] Run all frontend `.test.ts`/`.test.tsx` regressions, TypeScript, production build and existing production guards; run the affected backend suites, Django check and migration dry run.
- [x] Inspect live Lecturer appointments, history, research and supervision details; check narrow viewport, contextual Back, filtering and refresh. Do not mutate working academic records during browser acceptance.
- [x] Update `PROJECT_REQUIREMENTS.md`, `ARCHITECTURE_AND_CODING_DESIGN.md` and `PROJECT_STATUS.md` to supersede the former Lecturer Back-above-navigation rule and document verified results and any limitations.
- [x] Review the final diff for unrelated changes, permission regressions, misleading statuses and stale async state before delivery. Leave work on the requested branch without push/merge.
