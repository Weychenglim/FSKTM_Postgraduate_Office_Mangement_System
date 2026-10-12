# Consistent Record Navigation Implementation Plan

> Execute inline in the user-requested branch. Use test-driven development and verification-before-completion. The user's instruction to plan and start implementation authorises this work; preserve prior changes and leave the branch uncommitted.

**Goal:** Give substantial records/forms a consistent independent screen and reliable return, while retaining brief previews/confirmations as accessible modals.

**Architecture:** Existing routed details reuse `PageHeader`. Local record/form views use a main-content host that keeps the originating list mounted but hidden. A shared transient history entry supports browser Back; a data router supports dirty/busy navigation guards.

**Tech Stack:** React 19, React Router 8.3, TypeScript, existing Tailwind tokens, Node assert/tsx tests.

**Spec:** `docs/superpowers/specs/2026-10-11-record-navigation-design.md`

## Global constraints

- Existing Inter and `page-title`, `page-subtitle`, `back-link`, card/data-table roles only.
- One labelled Back above one record/form h1. No breadcrumbs, list heading or tab bar on details.
- Keep permissions, audit/documents, API validation, stale-state checks, notifications and existing routes.
- No dependencies, backend/schema changes, payload storage, commits or live academic mutations.
- Maintain all three root project documents and distinguish completed work from remaining checks.

## Task 1: Shared content frame, return navigation and modal

Files: create `frontend/src/components/RecordPage.tsx`, `frontend/src/components/PortalModal.tsx`, `frontend/src/utils/recordNavigation.ts` and behaviour tests; modify `AppLayout.tsx`, `main.tsx`, `PortalPrimitives.tsx`.

- [x] Test internal same-module return validation and query preservation with literal paths. Test frame renders one h1/Back and no dialog role.
- [x] Run `npx tsx src/utils/recordNavigation.test.ts` and new frame test; observe failure.
- [x] Implement a host context with mounted hidden workspace and sibling portal. Frame API: `RecordPage({title, backLabel, onBack, children, pageKey?, dirty?, busy?})`.
- [x] Convert root router to `createBrowserRouter([{path:'*', element:<>...<App /></>}])` / `RouterProvider` to enable draft blockers.
- [x] Implement transient history state containing an opaque view key and originating URL only; on browser Back close local selection. Explicitly routed records skip transient entries.
- [x] Add `PortalModal` native dialog primitive; retain confirmation styling and replace the manual overlay in `PortalConfirmModal`.
- [x] Run tests and TypeScript; inspect modal Escape, focus return and dirty/busy navigation in browser.

## Task 2: Supervisor workflows and context

Files: `LecturerSupervisorAppointments.tsx`, `LecturerAppointmentRequests.tsx`, `LecturerResearchWorkspace.tsx`, `StudentSupervisorAppointment.tsx`, `SupervisoryTeamManagement.tsx`, `RequestWorkspacePrimitives.tsx`, `App.tsx`, `constants/routes.ts`, `SupervisorWorkspacePages.test.tsx`, affected tests.

- [x] Replace the existing below-tab detail expectation with one h1 and no module nav on research/supervision/application detail; run and observe failure.
- [x] Add supporting request path `/supervisor-appointments/supporting-requests/:nominationId` with route recognition and separate ID prop. Test existing notification primary/research routes remain exact.
- [x] Primary/supporting table buttons navigate to route, not local drawer. Reuse existing detail loader, action form and audit content in `RecordPage`; routed mode has `pageKey` omitted.
- [x] Render list heading/tabs only on lists; use shared Back/header for research/profile/supervision. Persist roster `q`, `page`, `size` in query and preserve return context through profile/dossier navigation.
- [x] Migrate Student application workflow frame and hide tabs on Student research/new application pages.
- [x] Run route, supervisor workspace, appointment, research, supervisory-team and permission tests; TypeScript. Browser-check all three list/detail/return flows and reload existing URLs.

## Task 3: Panel records and nomination forms

Files: `LecturerPanelAppointments.tsx`, `RecommendationDetailsDrawer.tsx`, `RecommendPanelMemberDrawer.tsx`, `SubmittedRecommendationsPage.tsx`, `PanelWorkloadMonitoring.tsx`, related Panel tests.

- [x] Render actual review/tracking/form components with fixtures; assert normal page heading/Back and no overlay/dialog wrapper. Run tests before changing frames.
- [x] Replace enclosing drawer chrome with `RecordPage`, retaining content/actions. Use view keys for local records/forms and appropriate return labels; existing recommendation deep links skip transient history.
- [x] Preserve API-loaded review roles/actions and refresh status after decision. Guard changed nomination notes/replacement reason and active mutations.
- [x] Run Panel component/workflow tests, TypeScript; browser-check history and cancellation prompt without submitting.

## Task 4: Registry profiles/forms

Files: `StudentRegistry.tsx`, `StaffLecturersRegistry.tsx`, related registry tests.

- [x] Replace full-profile/create-account modal frames with `RecordPage`; preserve their loaded data and form submission/validation.
- [x] Give each local screen a stable view key and actual owning-list return label. Keep filters, selected registry tab and page mounted.
- [x] Guard changed create/edit fields. Run registry tests/TypeScript and browser-check profiles, cancellation and return context.

## Task 5: Administrative workflow/form pages

Files: `RightDrawer.tsx`, `LecturerCapacityManagement.tsx`, `SupervisorWorkloadMonitoring.tsx`, `WorkflowReconciliationCentre.tsx`, `AddTimelineEntryDrawer.tsx`, `EditTimelineEntryDrawer.tsx`, `UploadTimelineDrawer.tsx`, `TimelineManagement.tsx`, `SupervisorDocumentRequirements.tsx`, `SupervisorRequestHistory.tsx`.

- [x] Convert remaining substantial frames to `RecordPage` using their existing body; pass explicit owning-list Back labels and dirty/busy props.
- [x] Keep capacity reasons/version/fingerprint conflicts, publication acknowledgement, reconciliation checks/audit, timeline semester identity/import validation and document rules intact.
- [x] Replace brief delete confirmations with `PortalConfirmModal`; no live deletion/publication tests.
- [x] Run affected capacity/reconciliation/timeline/document/history tests and TypeScript; inspect narrow viewport tables and forms.

## Task 6: Brief preview audit and final verification

Files: `TimelineCalendar.tsx`, `NotificationsAnnouncements.tsx`, `AppLayout.tsx`, relevant remaining preview/confirmation call sites; root project docs.

- [x] Use `PortalModal` for brief previews; retain inline Marks scoring, file preview panes, FAQ/settings small edits and existing letter print controls.
- [x] Audit active full-record overlays and duplicate detail headings/Back controls with `rg`; correct active call sites, not unrelated dormant helpers.
- [x] Run every frontend `*.test.ts/tsx` script, `npm run lint`, `npm run build`, `npm run test:production-security`, `git diff --check`.
- [x] Inspect browser desktop/mobile populated screens, list state return, direct link/reload, browser Back, unsaved guard and modal keyboard behaviour. Save current screenshots outside repo.
- [x] Update requirements/design/status with superseding navigation policy, migration coverage and actual verification evidence. Report any remaining limitations honestly.

## Verification record

Completed in the requested checkout; all changes remain uncommitted. The complete suite passed 87/87 scripts, followed by affected frame/navigation regressions, TypeScript, production build and security/artifact guards after final lifecycle changes. Browser acceptance covered Supervisor request/history/profile/supervision context, deep reload, draft Back/browser Back/Escape, Panel local nomination/history, Office Registry/Timeline/capacity frames and return, and the 390 px appointment detail. No live academic mutation, repair, publication, import or deletion was submitted. Supporting nominations/pending Panel reviews were unpopulated in the demo workspace; fixtures and permission tests cover those states. Local form reload returns to its owner; unused legacy drawer exports remain untouched. Screenshots are saved outside the repository. All three root documents reflect the superseding policy.
