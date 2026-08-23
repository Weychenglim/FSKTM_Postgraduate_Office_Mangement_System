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
- `src/components/StudentDashboard.tsx` implements the student Dashboard Overview with a read-only role-scoped semester timeline, two appointment-focused status cards, and the shared persisted action centre.
- `src/components/LecturerDashboard.tsx` implements the lecturer Dashboard Overview with a read-only role-scoped semester timeline, two lecturer workspace cards, and the shared persisted action centre instead of office-staff monitoring sections.
- `src/components/CoordinatorDashboard.tsx` reuses the Lecturer dashboard composition for Programme Coordinators, loads live programme-scoped supervisor and panel approval counts, and limits its persisted action centre to managed-programme approvals.
- `src/components/CoordinatorSupervisorApprovals.tsx` is the Programme Coordinator supervisor final-approval queue. It loads `/api/appointments/supervisor/coordinator-queue/`, approves or rejects through the persisted coordinator decision endpoints, captures rejection reasons inline instead of using browser prompts, and renders the shared workflow audit log for each pending request.
- `src/components/DashboardTimeline.tsx` implements the shared semester timeline and accepts `showManageTimeline` so office staff can manage timelines while students see a read-only dashboard timeline. The Administration Dashboard controls the active project phase from the timeline header beside Refresh, and the shared header derives `Session YYYY/YYYY` from the active timeline session for every role dashboard.
- `src/components/DashboardTimeline.tsx` accepts optional `visibleRoles` for role-scoped dashboard display. Student/Lecturer dashboards pass role filters, while Office Staff/Admin omits the prop to retain the full timeline.
- `src/components/MonitoringTasksCard.tsx` is the shared Dashboard Action Centre. It loads `/api/dashboard/tasks/`, renders loading, error/retry, and empty states, formats waiting/deadline metadata, and delegates exact route navigation through `src/utils/workflowAgeing.ts`.
- `src/utils/workflowAgeing.ts` centralizes null-safe waiting/deadline labels, longest-waiting sorting, and action-target route resolution.
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
- `src/services/timelineApi.ts` connects the dashboard timeline UI directly to `/api/dashboard/timeline/active/`, `/api/dashboard/timeline/template/`, `/api/dashboard/timeline/upload/`, `/api/dashboard/timeline/entries/`, `/api/dashboard/timeline/entries/<id>/`, `/api/dashboard/timeline/audit-logs/`, and `/api/dashboard/tasks/`. It has no mock branch or backend-selection flag.
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
- `src/components/PanelAppointmentManagement.tsx` is the Office Staff/Admin panel monitoring surface; it loads records through `getPanelAppointments()`, loads workload snapshot rows through `getPanelWorkloads()`, derives summary counts and lifecycle-tab filtering with `src/utils/panelAppointmentRecords.ts`, supports optional longest-waiting ordering, exports persisted lifecycle and waiting fields, paginates filtered history at 10 rows per page, and keeps the filter card and records table in the same left-column stack.
- `src/components/PanelAppointmentDetail.tsx` renders the selected backend panel record directly, derives the header session badge from the academic-year portion of the backend semester string, shows the shared full panel workflow status timeline from backend lifecycle timestamps, distinguishes selected-panel rejection from Programme Coordinator rejection, displays stored rejection or cancellation reasons, enriches the related panel status card with staff/contact/assignment context, and uses concise no-records states for related files and evaluation data until those modules are connected.
- `src/utils/pagination.ts` provides shared pure helpers for 1-based page clamping, array slicing, total-page calculation, and displayed record ranges; Panel Appointment Management and Timeline Management use it with a page size of 10.
- `src/components/PanelWorkloadMonitoring.tsx` is the Office Staff/Admin read-only workload page; it loads lecturer workload rows through `getPanelWorkloads()`, derives summary counts and clamped utilization percentages with `src/utils/panelWorkloadRecords.ts`, exports the currently filtered workload records as CSV, and displays real workload detail items in the drawer.
- `src/components/PanelAssignmentDetail.tsx` renders the lecturer's backend panel assignment directly, derives the header session badge from the backend intake string, shows the shared full panel workflow status timeline from backend lifecycle timestamps, and uses concise no-records states for related documents and EE evaluation until those modules are connected.
- `src/components/SubmittedRecommendationsPage.tsx` and `src/components/RecommendationDetailsDrawer.tsx` are the supervisor-facing panel recommendation tracking surface; the drawer renders the same confirmation route as the review drawer, uses backend workflow timestamps when available, and exposes cancellation only for the submitting supervisor while the workflow is `SUBMITTED_TO_PANEL`.
- `src/components/StudentPanelAppointment.tsx` loads the authenticated student's panel appointment view and renders either generic faculty-processing age or confirmed appointed-panel details; it never names the internal selected-panel/coordinator stage while processing is pending.
- `src/services/appointmentsApi.ts` connects every Supervisor and Panel workflow directly to Django regardless of the global mock setting.
- Appointment services include Office supervisor workload at `/api/appointments/supervisor/workload/` and Lecturer self-workload at `/api/appointments/supervisor/my-workload/`; both are role-gated by Django.
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
- `dashboard.actions.build_dashboard_tasks()` assembles at most 20 role-scoped actions from persisted Supervisor, Panel, Marks, and Timeline records. Its sort key prioritizes overdue and due-today deadlines, then oldest waiting approvals, active timeline entries, and nearest upcoming deadlines.
- `dashboard.reports` is the shared read-only reporting boundary for `/api/dashboard/reports/` and `/api/dashboard/reports/export/`. It parses date filters once, applies role/programme/object scope before aggregation, and supplies the same filtered data to JSON serialization and in-memory XLSX generation.
- Reporting dates are explicit per module: Supervisor submission, Panel submission with creation fallback, Marks evaluation-period close with task-assignment fallback, and Timeline deadline start. Aggregates describe the current persisted lifecycle/deadline state rather than reconstructing historical snapshots.
- Office Staff/Admin reporting can optionally narrow to one programme; Programme Coordinator reporting is forced to the managed programme and includes Supervisor/Panel only; Lecturer reporting includes only assigned Supervisor, selected-panel, Marks, and Lecturer-targeted Timeline records. Students are rejected by the API.
- XLSX workbooks are generated with `openpyxl` without persistent export records. Role-visible sheets use fixed headers, ISO timestamps, frozen header rows, filters, and bounded column widths.
- `dashboard.dossiers.build_student_progress_dossier()` is the single aggregation and authorization boundary for `/api/dashboard/progress/<matric_no>/`. It resolves the canonical `accounts.Student` identity first, then applies role and section scope before querying or serializing module records.
- Dossier joins use `Student` for Supervisor history and `StudentResearchProfile` for Panel and Marks history. A missing research profile is a valid partial dossier, not an API error.
- Office Staff/Admin receives all sections; Programme Coordinators are constrained to `Coordinator.programme_managed` and omit Marks; Lecturers qualify through a supervision, panel, or Marks relationship and receive records filtered to their own assignments; Students receive a public self-only representation.
- Public dossier serialization removes internal Panel workflow stages and identifiers, pending panel identity, evaluator identity, marks/comments, and workflow audit events. Both unknown and unauthorized matric numbers fail with `Http404`.
- Dossier current-state ordering prioritizes active workflow records and otherwise uses newest persisted records. Existing `appointments.ageing` and `marks.deadlines` helpers derive waiting and deadline metadata without adding snapshots or recurring audit writes.
- `StudentProgressDossier.tsx` is a lazy-loaded read-only tab workspace. Backend-provided `visibleSections` controls tab rendering, while existing `targetModule`, `recordType`, and `recordId` values resolve staff deep links without backend-generated URLs.
- The `PanelRecommendation` database model enforces the one-active-recommendation-per-student rule with a conditional unique constraint, mirrors the frontend lifecycle status contract, and records submission, selected-panel decision, and Programme Coordinator decision timestamps for timeline display.
- Panel workload validation is centralized in the appointments domain: reserved workload is confirmed active panel appointments plus submitted/pending nominations, exposed through `/api/appointments/panel/candidates/`, and enforced again during recommendation creation.
- `CANCELLED_BY_SUPERVISOR` is terminal and is intentionally excluded from active recommendation and reserved-workload status sets, allowing a new recommendation for the same student without deleting the cancelled attempt.
- The student-facing endpoint `/api/appointments/panel/student/` is authenticated and role-gated to `Student`; it resolves the `StudentResearchProfile` for `request.user` and returns either pending state data or confirmed active `PanelAppointment` details, falling back to a pending state for valid student accounts without a linked research profile.

## Navigation Pattern

The app uses React Router clean URLs for top-level modules and high-value workflow detail links.

- Auth routes are `/login`, `/forgot-password`, and `/reset-password?uid=...&token=...`.
- Authenticated module routes include `/dashboard`, `/dashboard/timeline`, `/registry`, `/faq`, `/files`, `/supervisor-appointments`, `/letters`, `/announcements`, `/marks`, `/panel-appointments`, `/notifications`, and `/settings`.
- Dashboard page-level routing supports `/dashboard`, Office Staff/Admin-only `/dashboard/timeline`, role-gated `/dashboard/reports`, staff dossier links at `/dashboard/progress/:studentId`, and the Student self-view at `/dashboard/progress`; drawer, modal, filter, pagination, and selected-entry state inside Timeline Management stays component-local.
- `WorkflowReports.tsx` is lazy-loaded and consumes `workflowReportsApi`. It keeps date/programme filters local, renders compact CSS distributions without a charting dependency, hides unauthorized module sections, resolves attention rows through existing route helpers, and downloads the filtered workbook as a transient browser file.
- Dossier entry actions are passed as navigation callbacks into existing Office, Coordinator, and Lecturer Supervisor/Panel/Marks surfaces. The dossier remains outside the sidebar and exposes no mutation or export controls.
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

## Supervisor-to-Panel Handoff Design

- `appointments.supervisor_handoff.approve_supervisor_application()` owns final Supervisor approval. It runs in one database transaction, locks the application row, rechecks coordinator programme scope, pending state, and Supervisor workload, then resolves the research profile before creating the appointment and immutable workflow event.
- Profile resolution queries both the linked Student user and exact matric number under row locks. Two different matches are a fail-closed conflict. A single legacy matric match is linked in place so its primary key and downstream foreign keys remain stable.
- A profile is considered downstream-used when it has Panel recommendations, Panel appointments, or Marks evaluation tasks. Used profiles preserve populated historical content; assigning one to a different Supervisor is rejected rather than rewritten.
- The `appointments.0009_supervisorapplication_research_area` migration adds the legacy-compatible field and backfills only approved applications that already have confirmed Supervisor appointments. Ambiguous legacy matches remain untouched for operational resolution.
- `GET /api/appointments/panel/eligible-supervisees/` scopes profiles through active `SupervisorAppointment` rows and annotates the appointment identifier. The Panel recommendation serializer repeats that check during creation, so frontend query state cannot grant eligibility.
- Student Panel readiness is derived server-side from the authenticated student's Supervisor application, research profile, Panel recommendation, and active Panel appointment. The response deliberately collapses internal pending stages into `FACULTY_PROCESSING`.
- The frontend route helper encodes the student matric number as `/panel-appointments?student=...`. `App.tsx` passes that identifier to the existing Lecturer Panel workspace, which selects the authorized supervisee and opens the recommendation drawer only when the backend says a new recommendation is allowed.
- Reports and progress dossiers expose persisted Research Area text within their existing role scopes. No profile mutation is available from either read-only aggregation surface.

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
- SimpleJWT issues 15-minute access tokens for normal bearer-header authentication and 7-day refresh tokens tracked by its `token_blacklist` app. Refresh values are never serialized to frontend JavaScript; `accounts.session_tokens` sets them in an HttpOnly, strict, `/api/auth/` cookie and records explicit password-reset revocations.
- `accounts.authentication.RefreshCookieAuthentication` is limited to refresh and logout. It validates expiry, blacklist state, active-user state, and SimpleJWT's password-hash revocation claim before those endpoints rotate or revoke a session.
- `frontend/src/services/authSession.ts` owns the in-memory access token, one shared refresh promise, credentialed cookie exchange, and one-time `401` retry. JSON, multipart, and blob helpers all use this boundary; application startup refreshes before requesting `/auth/me/`.
- Login, refresh, and logout reject non-JSON requests. JSON content type forces cross-origin browser callers through the explicit CORS policy, while the strict cookie adds a second request-origin boundary. Application APIs do not accept the refresh cookie as authorization.
- `deploy/nginx` defines the supported same-origin production boundary: Nginx serves the Vite build, proxies `/api/` and `/admin/`, serves collected Django Admin assets, overwrites forwarded protocol headers, rejects unknown hosts, and applies the 12 MB request limit plus frontend security headers. Nginx owns public HSTS and suppresses Django's upstream HSTS header on proxied responses.
- Report-only and enforced Nginx includes carry identical CSP directives. The policy keeps executable scripts and network connections same-origin, blocks script attributes and active embedding, and narrowly allowlists Google Fonts and Unsplash while current React style attributes retain `unsafe-inline` style compatibility.
- Vite explicitly sets `build.sourcemap=false`; the existing production canary build also rejects map files, source-map references, inline entry scripts, demo credentials, and testing-console content. Nginx returns `404` for `.map` requests so third-party maps collected with Django static packages are not published.
- Vite is a development-only dependency pinned to the patched 6.x line. The frontend keeps `tsx` and its nested `esbuild` patched independently from the compatible direct `esbuild` 0.25.x build dependency, avoiding an unnecessary Vite major-version change.
- Browser routing uses the consolidated `react-router` 8 package; `react-router-dom` is no longer installed. Router 8 requires React/React DOM 19.2.7 or newer and establishes Node.js 22.22.0 as the frontend development and deployment runtime floor.
- The package-level npm override keeps the Vite and Autoprefixer dependency paths on PostCSS 8.5.18 or newer, preventing vulnerable transitive resolutions on clean installs.
- Letter printing no longer emits an inline script. The trusted application bundle registers load, print, and close handlers on the generated same-origin document so `script-src 'self'` remains enforceable.
- Production uses `STATIC_ROOT=backend/staticfiles` for Nginx-served Django Admin assets. The deployment runs `collectstatic`, uses relative `VITE_API_BASE_URL=/api`, and sets forwarded-proxy trust and DRF proxy counts to the actual proxy chain.

## Supervisor, Workflow Audit, Marks, and Dashboard Completion

- The `appointments` app owns supervisor applications, private document persistence and requirements, final appointments, and shared `AppointmentWorkflowEvent` audit records.
- Supervisor applications follow `SUBMITTED_TO_SUPERVISOR -> PENDING_COORDINATOR -> APPROVED`, with rejection states at either decision stage and conditional uniqueness for active student applications.
- Supervisor and Panel state-changing endpoints write immutable workflow events referencing exactly one workflow record.

### Private Supervisor Application Documents

- `SupervisorDocumentRequirement` is the Office-configured intake checklist. Its stable code is server-generated and immutable, requirements are deactivated rather than deleted, and `SupervisorDocumentRequirementAudit` stores immutable actor, action, reason, before, after, and timestamp values.
- `SupervisorApplicationDocument` stores a private `FileField`, validated content type, byte size, SHA-256 checksum, requirement relationship, and immutable code/label snapshots. The nullable file and requirement fields preserve pre-cutover metadata rows as non-downloadable `LEGACY_METADATA`.
- Student creation uses one atomic multipart request. `appointments.supervisor_documents` validates all active requirements and all files before model or storage persistence, caps intake at five files and 10 MB combined, derives MIME types from validated PDF/DOCX structure, and removes saved storage objects if the surrounding transaction fails.
- DOCX validation bounds archive entries and expansion, checks required Open Packaging Convention parts and CRC integrity, and rejects encryption, traversal or drive paths, symbolic links, and macro payloads. PDF validation rejects malformed boundaries and active JavaScript, launch, or embedded-file actions.
- Files use server-generated storage names under an application-specific private prefix. No serializer returns a media URL. `/api/appointments/supervisor/applications/<applicationId>/documents/<documentId>/download/` streams an attachment with `nosniff` only after object-level Student, Supervisor, Coordinator-programme, or Office authorization; denied and missing records share `404` behavior.
- `frontend/src/utils/supervisorDocuments.ts` owns browser convenience checks and multipart construction. Django remains authoritative. `SupervisorDocumentsList` centralizes authenticated Blob downloads and legacy availability labels across all role surfaces.
- `/supervisor-appointments/requirements` is an Office-only nested workspace rather than a sidebar module. The wider File Repository and Notifications/Announcements retain their existing ownership and behavior.
- Supervisor requests support terminal student cancellation from `SUBMITTED_TO_SUPERVISOR` through `/api/appointments/supervisor/applications/<id>/cancel/`, with row locking, mandatory reason, timestamp, audit event, and replacement eligibility.
- Protected Supervisor and Panel detail endpoints return complete workflow events only to involved users, programme-scoped coordinators, and Office Staff/Admin. Student users do not receive internal Panel recommendation history.
- Workflow and Approval Tracking owns persisted audit events, role-gated queues, dashboard counts, and stable module/record identifiers. Notification-center fan-out is a separate integration concern; appointment transitions expose the metadata needed for that module without making Notifications/Announcements part of this module's UI scope.
- `appointments.ageing` is a pure derivation layer with optional `now` injection. It maps pending Supervisor and Panel states to their current waiting owner, uses stage timestamp/workflow-transition/update fallbacks, clamps future timestamps to zero days, and returns null metadata for terminal records.
- Panel acceptance transitions directly to `PENDING_COORDINATOR`; `ACCEPTED_BY_PANEL` has been removed from the current model and uniqueness constraint.
- Workload limits come from `Supervisor.max_supervisees` and `Panel.max_appointments`.
- The `marks` app owns versioned rubric families/components, faculty-wide evaluation periods/tasks, mark entries/scores, immutable configuration audits, assignment overrides, and submitted-mark correction audits.
- `Rubric.family_code`, `version`, `target_mark`, and `supersedes` form the version family. `Rubric.is_locked` is derived from published/closed/archived period references or task references; locked versions are cloned rather than edited.
- `EvaluationPeriod.lifecycle_status` persists `DRAFT`, `PUBLISHED`, `CLOSED`, or `ARCHIVED`. `status_at()` derives the displayed scheduled/open/closed state from timezone-aware timestamps while the retained `is_open` field is synchronized only for compatibility.
- Migration `marks.0003` assigns existing rubrics to version 1, uses their active-component total as target, normalizes active display order, and maps existing periods without changing configuration, task, entry, score, or foreign-key identifiers.
- `marks.services` is the transactional configuration boundary. It uses row locks for version cloning, period transitions, and task creation, while draft/submission writes reload and lock the referenced period before validating its window so a concurrent close cannot race a lecturer write. Configuration mutations write immutable `MarksConfigurationAudit` snapshots.
- Marks APIs support lecturer-scoped draft saving and immediate submission locking, plus Office monitoring and task generation from active Supervisor and Panel appointments. Domain-state conflicts are represented by `MarksStateConflict` and returned as HTTP `409`.
- Office Staff/Admin Marks Assignment uses `/api/marks/periods/` and `/api/marks/assignment-options/` to populate production forms for task generation and backup evaluator assignment; raw database ID prompts are not part of the finished workflow.
- Office Staff/Admin Marks overview combines `/api/marks/periods/`, `/api/marks/`, and `/api/dashboard/summary/` so period cards, submission monitoring, and Mark Entry Records use the same live task/record data.
- Mark Entry Records accepts an initial status tab for dashboard and monitoring deep links; shared `src/utils/markRecords.ts` owns mark record summaries and status-tab filtering.
- `/api/marks/` derives display status from task period timing, returning `Overdue` for unsubmitted tasks after `EvaluationPeriod.closes_at` without adding a database status.
- `marks.deadlines` derives `dueAt`, `daysUntilDue`, and `deadlineState` from `EvaluationPeriod.closes_at`; submitted entries return `COMPLETE`, and the Marks workflow remains tracking-only.
- `EvaluationTask.evaluator_role` distinguishes `SUPERVISOR`, `PANEL`, and `BACKUP` tasks; duplicate prevention includes the evaluator role so the same student/period can have separate supervisor and panel marks.
- `marks.services.ensure_period_tasks()` is the shared generation path for manual Office Staff/Admin generation and active-period safety generation. It and backup/manual overrides require a published, non-ended period; backup assignments are audited by `EvaluationTaskOverrideAudit`.
- Privileged mark correction/reopening lives in `marks.services` and is used by Django Admin with mandatory reasons and before/after snapshots. Submitted comments follow the same audited correction path as submitted component scores and cannot fall through to a normal model save.
- Office configuration APIs are rooted at `/api/marks/rubrics/` and `/api/marks/periods/`; stable record details are loaded from `/api/marks/records/<recordId>/`. Configuration endpoints are Office Staff/Admin-only and expose archived periods only with `includeArchived=true`.
- `canAccessMarksAdministration()` guards `/marks/config`, `/marks/rubrics`, `/marks/tasks`, `/marks/records`, and record-detail routes before mounting an Office screen. Django authorization remains authoritative and independently returns `403`.
- The Marks frontend is backend-only. `marksApi.ts` has no mock switch, runtime mock imports, or committed period/rubric state; live API metadata drives lifecycle commands, readiness, overview attention, task totals, lecturer component forms, and Office record details.
- Production artifact tests reject Marks mock canaries and legacy backend-switch content. Unsupported PDFs, mark sheets, simulated sync, fake documents, and notification commands remain absent until authoritative relationships and templates exist.
- `/api/dashboard/summary/` aggregates role-scoped live Supervisor, Panel, and Marks counts, including mark-task counts split by evaluator role.
- `/api/dashboard/tasks/` is the role-scoped action feed. Student Panel actions are deliberately declassified to `FACULTY_PROCESSING` with null record identifiers, while Office Staff/Admin, Lecturer, and Programme Coordinator actions retain only identifiers authorized for their existing module routes.
- Supervisor, Panel, and Timeline retain their existing service boundaries. Marks no longer uses `VITE_USE_MARKS_BACKEND`; its production service always calls Django.

## Testing Strategy

- Run `npm run lint` for TypeScript compilation checks.
- Run `npm run build` for production build verification.
- Run `npm run audit:security` to fail on any npm advisory at low severity or higher. Inspect `npm ls vite tsx esbuild --all` for build-tool changes and `npm ls postcss react react-dom react-router --all` for routing/security updates to catch invalid, vulnerable, or duplicated dependency trees.
- Production security tests must compare report-only and enforced CSP directives, reject permissive script sources, and inspect emitted artifacts for source maps and inline entry scripts.
- Route-level code-splitting changes must keep all routed module screens lazy-loaded from `App.tsx`, avoid raising `chunkSizeWarningLimit`, and preserve the split vendor chunks in `vite.config.ts`.
- Run focused frontend route helper tests with `npx tsx src/constants/routes.test.ts` and `npx tsx src/utils/workflowTracking.test.ts` when navigation behavior changes.
- Run `python manage.py test` for backend workflow and permission checks.
- Start the Vite dev server and smoke-test Dashboard Overview plus each newly routed office-staff module after UI changes.
## Backend-Only Owned Module Boundary

- Dashboard/Timeline, Supervisor Appointments, Panel Appointments, Marks, and Workflow/Approval Tracking form the production data boundary. Their frontend services import `request`/`requestBlob` only and never import mock datasets, inspect `USE_MOCKS`, or invoke `mockResponse`.
- Global `VITE_USE_MOCKS` and mock latency remain in `apiClient.ts` solely for unfinished or teammate-owned services. The removed module-specific switches cannot override the owned boundary.
- `appointmentsApi.ts` and `timelineApi.ts` preserve their Promise-based component contracts while propagating `ApiError` and network failures to screen-level loading/error/retry states.
- Office supervisor workload is aggregated from active `SupervisorAppointment` rows and `Supervisor.max_supervisees`. Lecturer self-workload and enriched active-supervisee rows provide persisted capacity, identity, research, and appointment detail without local enrichment.
- Supervisor acceptance reloads the backend queue and workload. The active appointment appears only after Programme Coordinator approval creates the persisted `SupervisorAppointment`.
- Timeline upload and entry creation submit a persisted `semesterId`; term and session labels are derived by Django. Add/edit drawers display the selected Draft or Active timeline context and never accept free-text semester identity.
- Source guards inspect owned services and key workflow components; the production artifact guard builds with global mock mode and removed switches deliberately supplied, then rejects legacy exports, switches, fixture canaries, source maps, and demo-console content.

## Central Academic Semester Architecture

- The `academics` Django app owns `AcademicSemester`, immutable `AcademicSemesterAudit`, validation, lifecycle transitions, and the `/api/academics/semesters/` API boundary. Its service layer is the only writer for lifecycle changes.
- Database constraints enforce unique session-term combinations, valid date ordering, and at most one persisted `ACTIVE` row. Service validation additionally rejects overlapping non-archived ranges and invalid Kuala Lumpur effective dates.
- Activation uses a transaction and row locks. When another semester is active, the service closes that semester, closes its published Marks periods, activates the replacement, and records both semester audits before commit.
- Nullable foreign keys connect `SupervisorApplication`, `PanelRecommendation`, `SemesterTimeline`, and `EvaluationPeriod` to the authority. Appointment and Marks descendants inherit the semester through their source workflow or period instead of duplicating mutable relationships.
- Legacy semester text remains intentionally separate from the nullable relationship. Migration does not infer links from student intake or research-profile fields; serializers expose null IDs and `Legacy / Unassigned` labels when the relationship is absent.
- `current_effective_semester()` is the shared write guard. New appointment workflows, Marks publishing, and Marks task generation require an `ACTIVE` row whose dates include the Kuala Lumpur local date; existing decisions continue through their source record.
- Timeline version uniqueness is scoped by academic semester. Dashboard timeline reads resolve only the effective active semester, while Office management can query a selected Draft or Active semester by stable ID.
- Marks periods persist the academic-semester foreign key and validate opening/closing timestamps against its date range. Semester handover closes old published periods; extension deliberately leaves their deadlines unchanged.
- Dashboard action feeds retain unresolved carryover Supervisor and Panel items while Timeline and Marks actions are active-semester scoped. Reports resolve `active`, `all`, `unassigned`, or stable code selectors before applying role/programme authorization.
- The React `academicSemestersApi` is the central client. `/dashboard/semesters` is lazy-loaded and Office-only, while `ActiveSemesterContext` supplies a minimal read-only band to every role dashboard. Timeline and Marks configuration use server-provided semester options rather than local labels.

## Appointment Lifecycle and Reassignment Architecture

- `SupervisorAppointment` and `PanelAppointment` own normalized lifecycle state and closure metadata. Conditional unique constraints enforce one active appointment per Student/profile, while nullable self `supersedes` links preserve handover lineage.
- `AppointmentLifecycleEvent` is append-only and references exactly one appointment through a database check constraint. Approval events remain in `AppointmentWorkflowEvent`; lifecycle activation/closure events are a separate audit stream.
- `appointments.appointment_lifecycle` is the transaction boundary for direct closure and approved handover. It locks referenced and active appointment rows, validates actor scope and lineage, retires dependent Marks tasks, applies transitions, and converts uniqueness races into `409` conflicts.
- Supervisor final approval continues through `supervisor_handoff.approve_supervisor_application`. That transaction provisions the research profile, invokes lifecycle handover, cancels outgoing in-flight Panel recommendations, and appends the approval event as one unit.
- Panel final approval locks the recommendation and invokes the same handover service. Replacement serializers validate ownership, incumbent IDs, different evaluators, reasons, active workflow uniqueness, workload, and semester availability.
- `EvaluationTask` has an active/retired lifecycle and active-only uniqueness constraint. Immutable `EvaluationTaskHandoverAudit` rows store outgoing draft snapshots and optional replacement tasks while preserving historical evaluator attribution.
- Operational Marks, dashboard-action, report, workload, and completion queries filter active appointments/tasks. Office Marks records and authorized dossiers include retired history explicitly.
- Role UI reuses `AppointmentEndControl`, existing Supervisor application forms, and the Panel recommendation drawer. Coordinator Supervisor history has a dedicated programme-scoped endpoint instead of broadening Office monitoring.
- Migrations `appointments.0010` and `marks.0005`/`0006` add lifecycle state, lineage, audits, and conditional constraints without fabricating legacy closure dates or reasons.

## Academic Participant Lifecycle Architecture

- `accounts.Student` retains its existing business states and adds authoritative transition timestamp, Office actor, and reason. `accounts.Lecturer` adds `ACTIVE`, `RETIRING`, and `RETIRED` plus equivalent transition metadata.
- `ParticipantLifecycleAudit` is append-only, references exactly one Student or Lecturer through a database constraint, and stores previous/new state, actor, reason, affected record identifiers, and server time.
- `accounts.participant_lifecycle` is the transactional orchestration boundary. It row-locks participants, calculates blockers, delegates appointment closure to `appointments.appointment_lifecycle`, delegates task pause/resume/retirement to `marks.services`, writes workflow/lifecycle audits, and disables/revokes retired Lecturer sessions before commit.
- `accounts.eligibility` is a dependency-light shared policy used by appointment serializers/views and Marks generation. Candidate query filtering is paired with mutation-time validation so stale clients and crafted participant IDs cannot widen eligibility.
- `EvaluationTask` adds `PAUSED`; `EvaluationTaskLifecycleAudit` stores immutable pause/resume/retirement reasons and draft score/comment snapshots. Active-only operational queries naturally omit Paused and Retired history, while Office records and dossiers continue to query every lifecycle state.
- `/api/accounts/participants/` is Office-only and returns summary counts, filtered Student/Lecturer rows, blocker counts, actionable pending record IDs, account access, and immutable audits. Transition conflicts return `409`; unknown records return `404`; malformed transitions return `400`.
- `/dashboard/participant-lifecycle` is a lazy-loaded Office workspace under Dashboard routing. It provides filters, summary counts, blocker inspection, mandatory-reason transitions, individual pending-work cancellation, conflict/retry states, and audit history without a sidebar item.
- The authenticated `/auth/me/` payload exposes only the current participant lifecycle status and account-access class needed for read-only Student and Retiring Lecturer dashboard banners. Backend authorization remains authoritative.
- Workflow Reports append current participant lifecycle counts and attention records only for Office scope. Dossiers serialize reason, actor, and audits only for internal viewers; the public Student representation contains status and effective date only.
- Ordinary Django Admin lifecycle fields are read-only to prevent bypassing transactional side effects. Audit models are registered as immutable inspection surfaces.

## Workflow Reconciliation Architecture

- `dashboard.reconciliation` is a live query/service boundary over Accounts, Academics, Appointments, Dashboard/Timeline, and Marks. Detectors return ephemeral issues; only successful repair audits are persisted.
- Stable issue IDs combine detector, entity type, and entity ID. SHA-256 fingerprints cover current state and suggestion, providing preview/apply optimistic concurrency without mutable issue rows.
- `/api/dashboard/reconciliation/` supports module, severity, repairability, programme, search, and pagination filters. Preview/apply rescan current state; audits are Office-only and append-only.
- `accounts.authorization.coordinator_programme()` centralizes programme scope. User role is the portal gate and `Coordinator.programme_managed` is the sole authority used by Appointments, Dashboard actions, Reports, Dossiers, lifecycle services, and reconciliation.
- Repairs use `transaction.atomic`, `select_for_update`, current eligibility/workload checks, and existing appointment/Marks services. Semester assignment preserves legacy strings; approved handoff repair retains original Coordinator attribution and decision date.
- `marks.services.reconcile_evaluation_task()` performs one-task pause, resume, or retirement with submitted-entry rejection and immutable draft/comment snapshots. Missing tasks continue through idempotent `ensure_period_tasks()`.
- `WorkflowReconciliationAudit` stores issue/entity/action, Office actor, mandatory reason, fingerprint, before/after JSON, affected identifiers, and timestamp. Updates and deletes are rejected.
- The lazy Office-only React route uses typed list, preview, apply, and audit services with filters, pagination, current-state inspection, deep links, explicit confirmation, stale-conflict recovery, and no Apply control for review-required issues.
- Dashboard tasks and Workflow Report attention rows link to reconciliation. Announcements/Notifications and unsafe history merges remain outside this boundary.

## Planned Lecturer Capacity Architecture

- `SemesterCapacityPlan` versions belong to `AcademicSemester`; only one published version is authoritative per semester. Task 1 persists the plan schema and reserves lifecycle transitions for a later transactional publication service.
- `LecturerCapacityEntry` snapshots independent Supervisor and Panel limits. Validated individual model saves are the authoritative mutation path; direct QuerySet and bulk updates, conflict upserts, conflict ignores, and unsupported bulk-create options are disabled. Ordinary conflict-free bulk creation is limited to one Draft plan per batch: it deterministically locks that plan, prevalidates every entry and in-batch plan/Lecturer uniqueness before the first save, then saves sequentially in one transaction. Each validated model save may safely reissue the same plan lock. Any failure restores every caller object's original primary key and Django persistence state before re-raising the original exception. Instance deletion locks and validates the exact persisted entry and Draft plan before delegating to Django's model deletion so signal instance and origin semantics remain native. QuerySet deletion captures the exact locked and validated entry primary keys, then runs cascaded or raw deletion through a fresh primary-key-only queryset so mutable related-field predicates are never re-evaluated.
- `LecturerAvailabilityWindow` stores role-specific, semester-bounded operational restrictions without deleting or rewriting history. Individual saves lock the owning semester and validate projected persisted state; unsafe bulk mutation and physical deletion paths are disabled.
- `LecturerCapacityAudit` is append-only across instance, QuerySet, bulk-update, deletion, and conflict-update paths. Ordinary inserts and non-updating bulk inserts remain available.
- `academics.capacity` is the shared read-only semester/role resolver. It reads only the published plan, current persisted account/lifecycle and role eligibility, active same-role availability windows, and global workload rows. State precedence is `INELIGIBLE`, `NOT_CONFIGURED`, `TEMPORARILY_UNAVAILABLE`, `OVER_CAPACITY`, `FULL`, then `AVAILABLE`; zero limits and non-negative arithmetic are handled explicitly. Its frozen result exposes an applicable availability end date only when the final state is `TEMPORARILY_UNAVAILABLE`; every other state returns null, and neither the result nor public conflict messages expose the internal reason.
- Existing workload semantics remain intact: active Supervisor appointments consume Supervisor capacity, while active Panel appointments and submitted/pending recommendations are reported separately as active and reserved load. Existing no-semester workload-limit callers continue reading legacy profile values; semester-aware compatibility calls delegate to the resolver and fail closed to zero for missing policy or ineligible Lecturers.
- Semester activation will call a fail-closed readiness check for complete published coverage. Final approvals will re-resolve capacity and availability under transaction and row locks.
- The planned lazy `/dashboard/lecturer-capacity` workspace is Office-only and outside the sidebar. Other roles receive only authorized derived capacity fields through existing module APIs.
- The approved detailed design is recorded in `docs/superpowers/specs/2026-08-19-lecturer-capacity-availability-design.md`; Task 1 model, admin, migration, and persistence safeguards and the Task 2 resolver are complete, while lifecycle services, APIs, workflow integration, and UI work remain pending.
