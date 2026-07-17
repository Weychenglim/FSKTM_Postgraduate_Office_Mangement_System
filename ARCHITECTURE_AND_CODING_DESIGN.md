# Architecture and Coding Design

## Tech Stack

- React 19 with TypeScript
- React type declarations through `@types/react` and `@types/react-dom` for editor and `tsc` support.
- React Router DOM for clean URL routing in the frontend portal.
- Vite for development and production builds
- Tailwind CSS utility classes
- Lucide React icons
- Motion for animated drawer transitions
- `openpyxl` for Django-side structured `.xlsx` semester timeline template generation and upload parsing.

## Repository Layout

- Project root is the workspace entry point and contains the three mandatory governance documents.
- `frontend/` contains the Vite React application, including `src/`, `index.html`, `vite.config.ts`, `tsconfig.json`, `package.json`, `package-lock.json`, `metadata.json`, and the frontend `.env.example`.
- `frontend/.env.example` documents only public `VITE_` variables. A frontend `.env` file is optional unless local overrides are needed.
- `backend/` contains the Django backend, including `manage.py`, `config/`, `accounts/`, `appointments/`, `letters/`, `requirements.txt`, `README.md`, and the backend `.env.example`.
- `backend/dashboard/` contains dashboard-owned backend persistence and APIs for active semester timelines, timeline entries, Excel import/export, dashboard tasks, and timeline audit logs.
- `docs/` contains supporting documents such as `DATABASE_SETUP.md`, requirements PDFs, use-case PDFs, and implementation specs/plans.
- `docs/legacy/` is reserved only for preserved generated metadata that is not part of the runnable application.
- Generated local folders such as `frontend/node_modules`, `frontend/dist`, and `.venv` are ignored and should not be treated as source modules.

## Application Structure

Frontend paths in this section are relative to `frontend/`.

- `src/main.tsx` mounts the React app inside `BrowserRouter`.
- `src/App.tsx` owns the current demo authentication state and derives top-level module routing from the current URL. Auth, layout, route constants, session utilities, and small marks-overview primitives stay eager, while routed module screens are loaded through `React.lazy` named-export wrappers behind a shared authenticated `Suspense` fallback.
- `vite.config.ts` defines Rollup manual chunks for React, React Router, Motion, and Lucide so shared vendor code stays separate from the app shell and route-level chunks.
- `src/constants/routes.ts` centralizes clean URL paths, sidebar-to-route mapping, route-to-sidebar active-state mapping, known-route detection, and workflow notification deep-link targets.
- `src/components/AppLayout.tsx` provides the authenticated portal layout.
- `src/components/Sidebar.tsx` defines the office staff sidebar navigation labels.
- `src/components/AdministrationDashboard.tsx` implements the Dashboard Overview module.
- `src/components/AdministrationDashboard.tsx` intentionally hides unfinished-module summary cards in the FYP presentation slice and keeps lower dashboard records/actions as lightweight navigation surfaces; its lecturer panel workload attention count is derived from `getPanelWorkloads()` rather than a hardcoded mock count.
- `src/components/StudentDashboard.tsx` implements the student Dashboard Overview with a read-only role-scoped semester timeline, two appointment-focused status cards, and shared timeline-driven next actions.
- `src/components/LecturerDashboard.tsx` implements the lecturer Dashboard Overview with a read-only role-scoped semester timeline, two lecturer workspace cards, and shared timeline-driven next actions instead of office-staff monitoring sections.
- `src/components/CoordinatorDashboard.tsx` reuses the Lecturer dashboard composition for Programme Coordinators, loads live programme-scoped supervisor and panel approval counts from backend workflow state, and uses the shared Lecturer-scoped timeline and next actions.
- `src/components/CoordinatorSupervisorApprovals.tsx` is the Programme Coordinator supervisor final-approval queue. It loads `/api/appointments/supervisor/coordinator-queue/`, approves or rejects through the persisted coordinator decision endpoints, captures rejection reasons inline instead of using browser prompts, and renders the shared workflow audit log for each pending request.
- `src/components/DashboardTimeline.tsx` implements the shared semester timeline and accepts `showManageTimeline` so office staff can manage timelines while students see a read-only dashboard timeline. The Administration Dashboard controls the active project phase from the timeline header beside Refresh, and the shared header derives `Session YYYY/YYYY` from the active timeline session for every role dashboard.
- `src/components/DashboardTimeline.tsx` accepts optional `visibleRoles` for role-scoped dashboard display. Student/Lecturer dashboards pass role filters, while Office Staff/Admin omits the prop to retain the full timeline.
- `src/components/TimelineNextActions.tsx` loads the active semester timeline and derives reusable Student/Lecturer next-action lists from timeline entries whose target roles include the current role, with loading, error, no-timeline, and no-role-event states.
- `src/components/TimelineCalendar.tsx` provides the shared P1/P2 month-lane calendar-style timeline display used by Administration Dashboard and Timeline Management, including one row per event, day-proportional date bars across month columns, compact wrapping event title labels without inline date text or separate marker lines, an empty P2 state when P2 entries are not uploaded yet, and a details modal that shows the entry detail/description when a timeline label is clicked.
- `src/components/PortalPrimitives.tsx` provides shared portal primitives for page headers, cards, buttons, status badges, segmented controls, removable tags, progress bars, status dots, confirmation modals, and toast notifications. `PortalToast` and `PortalConfirmModal` render through `document.body` with high z-index layering so feedback and confirmations remain above sticky headers, drawers, and modals.
- Dashboard, supervisor, and panel appointment flows use `PortalToast` or inline field validation for user feedback instead of browser-default prompts/alerts for workflow decisions.
- `src/components/PortalPrimitives.tsx` also centralizes common status-to-badge tone mapping through `getStatusBadgeTone`, so tables, workload views, upload panels, lecturer cards, and shared status chips avoid duplicated color logic.
- `src/components/PanelWorkflowTimeline.tsx` provides the shared full panel workflow status timeline used by Office Staff/Admin panel appointment detail and Lecturer panel assignment detail, including recorded workflow date-times when backend timestamp fields are available.
- `src/utils/csvExport.ts` provides a small shared CSV builder/downloader used by Office Staff/Admin panel appointment and panel workload exports.
- `src/utils/landingPage.ts` centralizes the default authenticated landing module so every role enters through Dashboard Overview after a normal login.
- `src/constants/programmes.ts` centralizes the approved system programme labels used by dashboard and panel-facing UI/data paths.
- `src/components/TimelineManagement.tsx` implements the dashboard timeline management sub-view.
- `src/components/SettingsView.tsx` implements the Settings module (profile summary, contact details, password change, and notification preferences) and is routed for every role.
- `src/components/NotificationsAnnouncements.tsx` is the notification-bell view, split into Announcements and Notifications tabs (the feed is split by the backend `isAnnouncement` flag).
- `src/context/NotificationsContext.tsx` is the shared notifications store; it feeds both the bell badge and the bell view.
- `src/config/demoLogin.ts` owns fictional demo identifiers and the development-only credential assembly. It requires Vite development mode, an explicit enable flag, and all four role passwords before exporting a usable prefiller configuration; production dead-code elimination removes the console branch and password values.
- Timeline add/edit drawers keep timeline classification limited to P1/P2 and do not submit status; the backend derives the displayed status from the selected date range.
- `src/services/timelineApi.ts` connects the dashboard timeline UI to `/api/dashboard/timeline/active/`, `/api/dashboard/timeline/template/`, `/api/dashboard/timeline/upload/`, `/api/dashboard/timeline/entries/`, `/api/dashboard/timeline/entries/<id>/`, `/api/dashboard/timeline/audit-logs/`, and `/api/dashboard/tasks/`. It uses `VITE_USE_TIMELINE_BACKEND=true` by default so timeline management can persist to Django even while unfinished modules continue using global mock mode.
- Existing appointment and marks-entry modules remain in their own component files under `src/components`.

## Backend Data Model

- `accounts.User` is the login superclass (email, role discriminator, phone, flags). Role-specific data lives in one-to-one subtype "profile" tables that share the user's primary key: `Student`, `OfficeStaff`, and `Lecturer`. `Coordinator`, `Supervisor`, and `Panel` are one-to-one specializations of `Lecturer` (overlapping — a lecturer may hold several).
- `accounts.management.commands.seed_users` is a guarded development fixture command. It checks `DEBUG`, `ENABLE_DEMO_ACCOUNTS`, and four environment-supplied role passwords before any mutation, validates optional JSON legacy-email mappings, migrates mapped users in place, and reuses profile-number conflicts so protected timeline, audit, and appointment references retain their primary keys.
- Demo environment flow is deliberately split: ignored `backend/.env` supplies seed passwords, ignored `frontend/.env.development.local` supplies development prefills, and tracked `.env.example` files keep the feature disabled with blank placeholders. The production canary-build test scans emitted HTML and JavaScript for passwords and console markers.
- `User.to_public_dict()` reassembles the flat shape the frontend `DemoUser` expects from these profile tables, so the auth API contract is unchanged.
- The `letters` and `announcements` apps own the letter-template, announcement, and per-recipient notification tables.
- The full user/role ER diagram lives at `docs/erd/01-user-roles.md`; `docs/erd/` is the home for further ER diagrams as more modules are modeled.
- `src/components/LecturerPanelAppointments.tsx` is role-aware: Lecturer users see supervisor recommendation, selected-panel review queue, a separate reviewed-request history page launched from the queue header, and confirmed panel assignments; Programme Coordinator users see a programme-scoped confirmation queue and full-lifecycle records.
- `src/components/PanelRecommendationRecordsTable.tsx` provides the shared searchable, status-filtered, 10-row paginated read-only table used for coordinator programme records and lecturer reviewed history.
- `src/utils/panelRecommendationRecords.ts` centralizes recommendation lifecycle grouping and records filtering.
- `src/components/PanelAppointmentManagement.tsx` is the Office Staff/Admin panel monitoring surface; it loads records through `getPanelAppointments()`, loads workload snapshot rows through `getPanelWorkloads()`, derives summary counts and lifecycle-tab filtering with `src/utils/panelAppointmentRecords.ts`, exports the currently filtered appointment records as CSV with persisted lifecycle identifiers/timestamps/reasons, paginates filtered history at 10 rows per page, and keeps the filter card and records table in the same left-column stack so desktop spacing is not affected by the right-side widgets.
- `src/components/PanelAppointmentDetail.tsx` renders the selected backend panel record directly, derives the header session badge from the academic-year portion of the backend semester string, shows the shared full panel workflow status timeline from backend lifecycle timestamps, distinguishes selected-panel rejection from Programme Coordinator rejection, displays stored rejection or cancellation reasons, enriches the related panel status card with staff/contact/assignment context, and uses concise no-records states for related files and evaluation data until those modules are connected.
- `src/utils/pagination.ts` provides shared pure helpers for 1-based page clamping, array slicing, total-page calculation, and displayed record ranges; Panel Appointment Management and Timeline Management use it with a page size of 10.
- `src/components/PanelWorkloadMonitoring.tsx` is the Office Staff/Admin read-only workload page; it loads lecturer workload rows through `getPanelWorkloads()`, derives summary counts and clamped utilization percentages with `src/utils/panelWorkloadRecords.ts`, exports the currently filtered workload records as CSV, and displays real workload detail items in the drawer.
- `src/components/PanelAssignmentDetail.tsx` renders the lecturer's backend panel assignment directly, derives the header session badge from the backend intake string, shows the shared full panel workflow status timeline from backend lifecycle timestamps, and uses concise no-records states for related documents and EE evaluation until those modules are connected.
- `src/components/SubmittedRecommendationsPage.tsx` and `src/components/RecommendationDetailsDrawer.tsx` are the supervisor-facing panel recommendation tracking surface; the drawer renders the same confirmation route as the review drawer, uses backend workflow timestamps when available, and exposes cancellation only for the submitting supervisor while the workflow is `SUBMITTED_TO_PANEL`.
- `src/components/StudentPanelAppointment.tsx` loads the authenticated student's panel appointment view from the appointments service and renders either the pending Programme Coordinator confirmation state or the confirmed appointed-panel details.
- `src/services/appointmentsApi.ts` connects the lecturer-side panel workflow to Django endpoints when `VITE_USE_MOCKS=false` while keeping mock mode available.
- `src/services/appointmentsApi.ts` uses `VITE_USE_PANEL_BACKEND` so the panel workflow can persist to Django even when the broader frontend remains in mock mode.
- `src/services/appointmentsApi.ts` exposes `getStudentPanelAppointment()` for the student panel view, with mock fallback available when panel backend mocks are enabled.
- Backend `appointments` app owns `StudentResearchProfile`, `PanelRecommendation`, and `PanelAppointment` persistence plus role-gated DRF endpoints under `/api/appointments/panel/`.
- `/api/appointments/panel/coordinator-workspace/` resolves `request.user.lecturer.coordinator.programme_managed` as the authoritative scope and returns the programme, pending count, final-approval queue, and newest-first full recommendation lifecycle records. Blank programme assignments return an empty protected workspace.
- `/api/appointments/panel/review-history/` returns recommendations where the authenticated selected panel lecturer has recorded a panel decision plus recommendations cancelled before that lecturer acted, preserving downstream coordinator status and read-only cancellation history.
- `POST /api/appointments/panel/recommendations/<id>/cancel/` locks the recommendation row, verifies ownership and exact `SUBMITTED_TO_PANEL` status, requires a reason, stores `cancelled_at` and `cancellation_reason`, and records an immutable `SUPERVISOR_CANCEL` workflow event.
- Coordinator queue retrieval and approve/reject endpoints enforce the same managed-programme boundary server-side; frontend filtering is not treated as authorization.
- The office monitoring endpoint `/api/appointments/panel/` is Office Staff/Admin-only and returns one row per meaningful workflow attempt. Each appointment is returned once, its underlying approved recommendation is omitted to prevent duplication, all other recommendation attempts remain visible, and a profile is returned as `No Panel` only when it has no appointment or recommendation. Every row has a stable `recordId` (`appointment-*`, `recommendation-*`, or `profile-*`), while `id` remains the student matric number. Rejected and cancelled rows retain the recommended member, workflow reason, lifecycle timestamps, recommendation ID, and audit events used by the Office Staff/Admin detail page.
- The office workload endpoint `/api/appointments/panel/workload/` returns lecturer workload rows for Office Staff/Admin users, counting active confirmed panel appointments plus active pending nominations and including the underlying workload items for read-only drill-down.
- Appointment serializers and validators resolve public `staffId`, `studentId`, and `department` fields through the normalized `Lecturer`, `Student`, and `OfficeStaff` profile relations rather than flat columns on `User`.
- Backend `dashboard` app owns `SemesterTimeline`, `SemesterTimelineEntry`, and `TimelineAuditLog` persistence plus role-gated DRF endpoints under `/api/dashboard/`.
- Dashboard timeline upload uses a structured Excel workbook parsed with `openpyxl`; upload replacement deactivates the previous active timeline, creates the new active timeline and entries in one transaction, derives internal step order and status from row order/date ranges, and records an audit log.
- `dashboard.upload_security` validates the 10 MB upload limit and the XLSX ZIP package before `openpyxl` parsing. It bounds entry count and total expansion, rejects encryption, traversal paths, macros, missing workbook parts, and failed CRC checks, then rewinds the stream for normal spreadsheet validation.
- Production reverse proxies must cap timeline upload request bodies at 12 MB, leaving multipart overhead above the application-level 10 MB file limit while rejecting larger bodies before Django workers process them.
- Dashboard timeline entries store both `title` and `detail`; `title` is the short schedule/table label and `detail` is the longer description shown in the details modal.
- Dashboard timeline target roles are limited to `STUDENT`, `LECTURER`, and `OFFICE_STAFF`; lecturer responsibilities are not split into panel/supervisor target-role values.
- Dashboard timeline entry patching is Office Staff/Admin-only and records an audit log for each saved entry change.
- Dashboard timeline entry creation, level moves, and deletion are Office Staff/Admin-only; new entries are attached to the active timeline, assigned internal ordering within their P1/P2 level, derive status from dates, and are recorded in `TimelineAuditLog`.
- Dashboard timeline audit logs are exposed through a management endpoint so Timeline Management can render real upload, replace, add, edit, and delete history instead of local mock rows; the newest loaded records are paginated locally at 10 rows per page.
- Active timeline retrieval is available to every authenticated role and returns a stable empty payload with `No timeline available at now` when no active timeline exists.
- Dashboard monitoring tasks are exposed through `/api/dashboard/tasks/`; the first backend-backed task set focuses Office Staff/Admin timeline ownership tasks and preserves frontend static monitoring fallbacks.
- The `PanelRecommendation` database model enforces the one-active-recommendation-per-student rule with a conditional unique constraint, mirrors the frontend lifecycle status contract, and records submission, selected-panel decision, and Programme Coordinator decision timestamps for timeline display.
- Panel workload validation is centralized in the appointments domain: reserved workload is confirmed active panel appointments plus submitted/pending nominations, exposed through `/api/appointments/panel/candidates/`, and enforced again during recommendation creation.
- `CANCELLED_BY_SUPERVISOR` is terminal and is intentionally excluded from active recommendation and reserved-workload status sets, allowing a new recommendation for the same student without deleting the cancelled attempt.
- The student-facing endpoint `/api/appointments/panel/student/` is authenticated and role-gated to `Student`; it resolves the `StudentResearchProfile` for `request.user` and returns either pending state data or confirmed active `PanelAppointment` details, falling back to a pending state for valid student accounts without a linked research profile.

## Navigation Pattern

The app uses React Router clean URLs for top-level modules and high-value workflow detail links.

- Auth routes are `/login`, `/forgot-password`, and `/reset-password?uid=...&token=...`.
- Authenticated module routes include `/dashboard`, `/dashboard/timeline`, `/registry`, `/faq`, `/files`, `/supervisor-appointments`, `/letters`, `/announcements`, `/marks`, `/panel-appointments`, `/notifications`, and `/settings`.
- Dashboard page-level routing intentionally supports only `/dashboard` and Office Staff/Admin-only `/dashboard/timeline`; drawer, modal, filter, pagination, and selected-entry state inside Timeline Management stays component-local.
- Supervisor Appointment page routes include `/supervisor-appointments/workload`, `/supervisor-appointments/new`, `/supervisor-appointments/history`, `/supervisor-appointments/supervisees/:studentId`, and the existing compatibility application route `/supervisor-appointments/:applicationId`.
- Marks sub-routes include `/marks/config`, `/marks/rubrics`, `/marks/tasks`, `/marks/records`, and `/marks/records/:recordId`.
- Panel Appointment page routes include `/panel-appointments/workload`, `/panel-appointments/records/:recordId`, `/panel-appointments/submitted`, `/panel-appointments/reviewed`, `/panel-appointments/assignments/:studentId`, and the compatibility recommendation route `/panel-appointments/recommendations/:recommendationId`.
- Workflow deep links include `/supervisor-appointments/:applicationId`, panel appointment record and assignment routes, and `/panel-appointments/recommendations/:recommendationId`.
- `App.tsx` derives the active sidebar item from `location.pathname`; sidebar clicks and dashboard shortcuts call `navigate(route)`.
- `RouteScrollRestoration` is mounted under `BrowserRouter` and resets the window to the top when `pathname` or `search` changes, while ignoring hash-only changes.
- Supervisor Appointment page-level state is route-derived in `App.tsx` and passed into role-specific supervisor components, while review drawers, student detail overlays, confirmation modals, filters, pagination, and toasts remain component-local.
- Panel Appointment page-level state is route-derived in `App.tsx` and passed into role-specific panel components, while drawers, dialogs, filters, pagination, tabs, and toasts remain component-local.
- Component-local UI state remains local for drawers, dialogs, filters, and non-shareable edit/create modes.
- `currentUser.role` controls whether shared sidebar entries render office-staff, lecturer, coordinator, or student workflows. Programme Coordinators route to their dedicated dashboard, live supervisor final-approval queue, and programme-scoped panel workspace. Lecturer and student routing remains role-specific as described above.
- All authenticated roles land on `Dashboard Overview` after normal login, direct visits to auth routes redirect to the dashboard, unauthorized module routes redirect to the dashboard, and unknown authenticated paths redirect to the dashboard.
- `Sidebar` filters visible navigation items by active role while preserving the responsive drawer behavior from the current app shell.
- Production hosts must serve `index.html` for unknown frontend paths so direct refresh works with clean URLs.

## Coding Conventions

- Components are functional React components.
- UI state is local to the owning component unless shared navigation is required.
- Shared navigation callbacks are passed down as props.
- Styling follows the existing Tailwind-heavy component pattern.
- New dashboard components are imported into the current app rather than replacing the whole frontend folder.
- Panel recommendation backend permissions are endpoint-enforced: supervisors can create/list their own recommendations, selected panel lecturers can accept/reject only assigned recommendations, and Programme Coordinators can confirm/reject only pending coordinator recommendations.
- Student panel appointment permissions are endpoint-enforced: only authenticated Student users can call the student panel endpoint, and the backend only returns the profile and appointed panel linked to the logged-in user.
- Semester timeline backend permissions are endpoint-enforced: all authenticated users can read the active timeline, while only Office Staff/Admin users can download templates, upload replacements, or patch timeline entries.
- DRF uses `IsAuthenticated` as its default permission. Login, password-reset request, and password-reset confirmation explicitly opt into `AllowAny`; logout requires authentication, while `/api/health/` stays outside DRF as a minimal public probe.
- A route-discovery security test walks every mounted `/api/` DRF view and exercises every declared method anonymously. It allows only the three recovery/login endpoints and verifies announcement routes return `401` without changing announcement behavior.
- Accounts, Supervisor, Panel, Dashboard, Marks, and Letters enforce role and object/programme scope in backend queries and decision handlers. Frontend route visibility is never treated as authorization.
- Announcement/Notification ownership, draft visibility, and attachment authorization remain deferred to the teammate-owned module and require a dedicated review before production.
- `accounts.throttles` provides separate settings-backed, per-client-IP scopes for login, password-reset request, and password-reset confirmation. `DRF_NUM_PROXIES=0` makes `REMOTE_ADDR` authoritative until a known proxy chain is configured.
- Development throttle counters use Django's local-memory cache. A shared Redis-compatible cache is a production prerequisite before running multiple API workers; otherwise each worker would enforce an independent counter.
- Frontend authentication forms centralize `429` handling in `src/utils/authErrorMessage.ts` and retain endpoint-provided messages for other API errors.
- `config.production_security.validate_production_environment` runs during settings import when `DEBUG=False`, before Django application initialization. It raises `ImproperlyConfigured` for unsafe secret keys, missing or wildcard hosts, and missing, malformed, or non-HTTPS CORS origins.
- Production settings enable HTTPS redirection, secure strict cookies, nosniff, same-origin referrers, frame denial, and a staged HSTS policy. Development keeps local HTTP defaults and does not enable those production transport controls.
- HSTS is environment-controlled with a 3,600-second initial duration and disabled subdomain/preload flags. Deployment may move to one year, subdomain coverage, and preload only after HTTPS validation for the full domain tree.
- `SECURE_PROXY_SSL_HEADER` is configured only when `DJANGO_TRUST_X_FORWARDED_PROTO=True`. The terminating proxy must discard inbound client `X-Forwarded-Proto` values and set an authoritative value before this opt-in is safe.

## Supervisor, Workflow Audit, Marks, and Dashboard Completion

- The `appointments` app owns supervisor applications, document metadata/requirements, final appointments, and shared `AppointmentWorkflowEvent` audit records.
- Supervisor applications follow `SUBMITTED_TO_SUPERVISOR -> PENDING_COORDINATOR -> APPROVED`, with rejection states at either decision stage and conditional uniqueness for active student applications.
- Supervisor and Panel state-changing endpoints write immutable workflow events referencing exactly one workflow record.
- Supervisor requests support terminal student cancellation from `SUBMITTED_TO_SUPERVISOR` through `/api/appointments/supervisor/applications/<id>/cancel/`, with row locking, mandatory reason, timestamp, audit event, and replacement eligibility.
- Protected Supervisor and Panel detail endpoints return complete workflow events only to involved users, programme-scoped coordinators, and Office Staff/Admin. Student users do not receive internal Panel recommendation history.
- Workflow and Approval Tracking owns persisted audit events, role-gated queues, dashboard counts, and stable module/record identifiers. Notification-center fan-out is a separate integration concern; appointment transitions expose the metadata needed for that module without making Notifications/Announcements part of this module's UI scope.
- Panel acceptance transitions directly to `PENDING_COORDINATOR`; `ACCEPTED_BY_PANEL` has been removed from the current model and uniqueness constraint.
- Workload limits come from `Supervisor.max_supervisees` and `Panel.max_appointments`.
- The `marks` app owns configurable rubrics/components, evaluation periods/tasks, mark entries/scores, and correction audits.
- Marks APIs support lecturer-scoped draft saving and immediate submission locking, plus office monitoring and task generation from active supervisor and panel appointments.
- Office Staff/Admin Marks Assignment uses `/api/marks/periods/` and `/api/marks/assignment-options/` to populate production forms for task generation and backup evaluator assignment; raw database ID prompts are not part of the finished workflow.
- Office Staff/Admin Marks overview combines `/api/marks/periods/`, `/api/marks/`, and `/api/dashboard/summary/` so period cards, submission monitoring, and Mark Entry Records use the same live task/record data.
- Mark Entry Records accepts an initial status tab for dashboard and monitoring deep links; shared `src/utils/markRecords.ts` owns mark record summaries and status-tab filtering.
- `/api/marks/` derives display status from task period timing, returning `Overdue` for unsubmitted tasks after `EvaluationPeriod.closes_at` without adding a database status.
- `EvaluationTask.evaluator_role` distinguishes `SUPERVISOR`, `PANEL`, and `BACKUP` tasks; duplicate prevention includes the evaluator role so the same student/period can have separate supervisor and panel marks.
- `marks.services.ensure_period_tasks()` is the shared generation path for manual Office Staff/Admin generation and active-period safety generation; backup/manual override tasks are audited by `EvaluationTaskOverrideAudit`.
- Privileged mark correction/reopening lives in `marks.services` and is used by Django Admin with mandatory reasons and before/after snapshots.
- The frontend dynamically renders backend-provided rubric components and retains the fixed form only for mock fallback data.
- `/api/dashboard/summary/` aggregates role-scoped live Supervisor, Panel, and Marks counts, including mark-task counts split by evaluator role.
- Completed modules can independently enable Django through `VITE_USE_SUPERVISOR_BACKEND`, `VITE_USE_PANEL_BACKEND`, `VITE_USE_MARKS_BACKEND`, and `VITE_USE_TIMELINE_BACKEND`.

## Testing Strategy

- Run `npm run lint` for TypeScript compilation checks.
- Run `npm run build` for production build verification.
- Route-level code-splitting changes must keep all routed module screens lazy-loaded from `App.tsx`, avoid raising `chunkSizeWarningLimit`, and preserve the split vendor chunks in `vite.config.ts`.
- Run focused frontend route helper tests with `npx tsx src/constants/routes.test.ts` and `npx tsx src/utils/workflowTracking.test.ts` when navigation behavior changes.
- Run `python manage.py test` for backend workflow and permission checks.
- Start the Vite dev server and smoke-test Dashboard Overview plus each newly routed office-staff module after UI changes.
