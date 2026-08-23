# Project Requirements

## Product Scope

The application is **A Web-Based Postgraduate Administrative Workflow, Appointment, and Project Evaluation Management System for FSKTM Coursework Programmes**.

The owned product boundary covers Dashboard/Timeline, Supervisor Appointments, Panel Appointments, Marks, and Workflow/Approval Tracking. Measurable outputs are persisted role-scoped workflow status; elapsed waiting duration and responsible stage; authoritative deadlines and Marks completion; immutable decision, appointment, and participant lifecycle audits; lifecycle eligibility enforcement; and role-scoped analytics and exports. Course registration, enrolment, credit accumulation, course scheduling, and general coursework results are explicitly outside this boundary.

The five owned completion modules are Dashboard/Timeline, Supervisor Appointment, Panel Appointment, Marks Entry, and Workflow and Approval Tracking. Notifications/Announcements is a separate integration module owned outside this slice; these workflows may expose audit and routing metadata for it, but this module does not own notification-center behavior.

## Programme Scope

- The system programme list is limited to `MASTER OF DATA SCIENCE (COURSEWORK)`, `MASTER OF CYBER SECURITY (COURSEWORK)`, and `MASTER OF ARTIFICIAL INTELLIGENCE (COURSEWORK)`.

## Repository Organization Requirements

- The project root must remain the workspace entry point.
- `PROJECT_REQUIREMENTS.md`, `ARCHITECTURE_AND_CODING_DESIGN.md`, and `PROJECT_STATUS.md` must stay at the project root.
- Frontend source, configuration, package files, and frontend runtime assets must live under `frontend/`.
- Frontend environment examples must include only public `VITE_` variables; a frontend `.env` file is optional unless local overrides are needed.
- Django backend source, configuration, requirements, and backend environment example files must live under `backend/`.
- Supporting PDFs, setup notes, specs, plans, and reference material must live under `docs/`.
- Generated local artifacts such as `node_modules`, `dist`, `.venv`, logs, and local `.env` files must be ignored and kept out of source-controlled project structure.

## Main Roles

- Office Staff/Admin
- Student
- Lecturer, including supervisor and panel responsibilities
- Programme Coordinator, as a separate authenticated role for panel appointment confirmation

## Current Frontend Scope

- Office staff/admin portal shell with authentication demo state.
- Sidebar navigation for dashboard overview, supervisor appointments, panel appointments, marks entry, and related administrative modules.
- Dashboard overview for office staff to monitor postgraduate administrative status, semester timeline, workload-related attention records, and quick module navigation.
- Registry management UI for student records and staff/lecturer account management.
- File management UI for repository browsing, document preview, upload flow, metadata, and document status handling.
- FAQ chatbot administration UI for maintaining academic FAQ entries.
- Letter generation UI for managing letter templates and template editing workflows.
- Announcement management UI for composing, filtering, and managing announcements.
- Notification center UI for office staff alerts and announcements.
- Forgot-password UI for unauthenticated account recovery guidance.
- Clean URL routing for authenticated portal modules and selected workflow detail links, so refresh, bookmarks, browser history, and notification deep links preserve the intended screen.
- Routed page transitions must reset the window scroll position to the top while keeping hash-only navigation available for future anchor behavior.
- Production builds must keep authenticated route-level module screens code-split and shared vendors chunked so Vite does not emit its default oversized JavaScript chunk warning.
- Marks and evaluation management UI for mark entry period configuration, rubric management, evaluation task assignment, submission monitoring, and mark records.
- Supervisor and panel appointment management UI for appointment status and workload monitoring.
- Lecturer workspace UI for supervisor appointment requests, active supervisees, panel assignment details, recommendation submission, assigned mark-entry tasks, mark-entry forms, and submitted-mark review.
- Student workspace UI for FAQ support, supervisor appointment viewing/application, panel appointment viewing, file submission, letter generation, and student dashboard shortcuts.
- Panel appointment records must appear directly below the search/filter controls on desktop layouts, with attention and workload widgets remaining in the right-side column.
- Panel appointment records should fit the desktop records card without requiring a horizontal scrollbar by using a wider records column, fixed table layout, and wrapped cell content.
- Office Staff/Admin Panel Appointment Management must load monitoring records from the persisted appointments backend when panel backend mode is enabled.
- Office Staff/Admin Panel Appointment records must be available only to Office Staff/Admin users; other authenticated roles must receive a forbidden response from the backend monitoring endpoint.
- Office Staff/Admin Panel Appointment summary cards must be calculated from the loaded panel records instead of hardcoded mock counts.
- Office Staff/Admin Panel Appointment records must include confirmed appointed panels, in-progress recommendations, rejected recommendations, cancelled recommendations, and eligible student research profiles with no panel workflow yet.
- Office Staff/Admin Panel Appointment records must preserve each historical recommendation attempt, so an earlier rejected recommendation remains visible as a separate record after a later recommendation is approved; the approved recommendation and its resulting appointment must not appear as duplicate rows.
- Office Staff/Admin Panel Appointment records must retain the recommended panel member, rejection stage, rejection reason, and available workflow timestamps for rejected attempts.
- Office Staff/Admin Panel Appointment records must treat cancelled supervisor recommendations as a separate visible lifecycle state with stable record IDs, cancellation reason, cancellation timestamp, recommendation ID, and workflow audit history.
- Office Staff/Admin Panel Appointment Records must paginate the filtered historical dataset at 10 records per page while summary cards and CSV export continue to use all matching records.
- Office Staff/Admin Panel Appointment status tabs must represent persisted lifecycle states only: All Records, No Panel, Pending, Approved, Rejected, and Cancelled. Workload alerts must remain in the dedicated workload monitoring surface.
- Office Staff/Admin Panel Appointment Detail must render selected backend panel record fields rather than screenshot/demo placeholders, show the academic year as `Session YYYY/YYYY`, show the complete panel workflow status timeline with recorded date-times when available, show richer related panel status information, and show related files/evaluation as concise no-records states until those modules are connected.
- Office Staff/Admin Panel Appointment record detail and workload monitoring must be page-level routed at `/panel-appointments/records/<recordId>` and `/panel-appointments/workload`, with back actions returning to `/panel-appointments` and unknown records showing a clear not-found state.
- Office Staff/Admin Panel Workload Snapshot and Panel Workload Monitoring must load lecturer workload from the persisted appointments backend instead of hardcoded lecturer rows.
- Office Staff/Admin Panel Appointment Management and Panel Workload Monitoring must export the currently filtered records as downloadable CSV files, including persisted lifecycle identifiers, timestamps, rejection metadata, and cancellation metadata for panel appointment records.
- Panel workload monitoring must count confirmed active panel appointments plus active pending nominations, show confirmed and pending counts separately, and classify lecturers as Available, Near Limit, or Full Load.
- Panel workload utilization displays must clamp progress values to a valid 0-100% range even if persisted workload limits are zero or inconsistent.
- Panel workload monitoring must be read-only for Office Staff/Admin users.

## Dashboard Requirements

- `Dashboard Overview` must render a real administration dashboard instead of a placeholder.
- The office-staff dashboard must show semester timeline status, selected records needing attention, monitoring tasks, and dashboard actions.
- For the FYP presentation slice, Administration Dashboard must keep the focus on the working semester timeline and selected monitoring lists; dependent summary cards for unfinished modules can be hidden to avoid implying unavailable integrations.
- Office staff must be able to open timeline management from the dashboard and return to the dashboard.
- Dashboard actions must route to existing modules such as Supervisor Appointments, Panel Appointments, and Marks Entry without breaking those modules.
- Administration Dashboard must display semester timeline entries in a month-lane calendar-style P1/P2 phase view instead of Month/Quarter/Year timeline controls.
- Dashboard semester timeline headings for Office Staff/Admin, Student, and Lecturer must display the academic period as `Session YYYY/YYYY` rather than a semester label.
- Each timeline event in the month-lane calendar must render on its own row so overlapping or adjacent events remain readable.
- Month-lane timeline bars must be positioned proportionally by actual day within the displayed month range, so short ranges ending early in a month do not fill the entire month column.
- Timeline event bars must show the timeline `Title` without inline date text, wrap long labels onto additional lines, and leave exact dates/details to the click-through modal.
- Timeline event bars must avoid separate vertical marker decorations and use compact readable labels so short events do not visually dominate a whole month column.
- Timeline labels in the calendar-style view must be clickable and open a detail modal with phase, start date, end date, action/status context, and `Detail` as the description.
- The P2 phase must remain selectable and show an appropriate empty state when P2 entries are not available yet.
- Administration Dashboard phase controls must use the full labels `Research Project 1` and `Research Project 2`, placed beside the Refresh action.
- Administration Dashboard must not show dashboard-level `Export Report` or `New Entry` actions.
- Administration Dashboard must not show the old status legend or `View Full Timeline` action below the semester timeline calendar.
- Administration Dashboard must not show the four placeholder summary cards for students without supervisor, supervisor records, panel records, and mark entry setup.
- Records Needing Attention must remove the redundant Status column, show zero impact for unfinished dependency rows, omit mark-entry task generation rows for now, and calculate the lecturer panel workload impact count from the persisted panel workload data.
- The shared Dashboard Action Centre must load persisted, role-scoped actions from `/api/dashboard/tasks/`; it must provide loading, error/retry, and empty states and navigate using the returned module, record type, and record ID.
- `Manage Timeline` must behave as a direct button that navigates to Timeline Management.
- Dashboard page-level routing must support only `/dashboard` and Office Staff/Admin-only `/dashboard/timeline`; unsupported Dashboard nested URLs must redirect authenticated users back to `/dashboard`.
- All authenticated users must be able to retrieve the active semester timeline for Dashboard Overview.
- Student and Lecturer dashboard timeline views must only display entries targeted to their role; Office Staff/Admin dashboard and management views may display all timeline entries.
- Student and Lecturer dashboards must retain their role-scoped semester timeline visualization and use the shared persisted Dashboard Action Centre for workflow, Marks, and timeline actions.
- If no active semester timeline is available, the dashboard must display `No timeline available at now` while keeping the rest of the dashboard available.
- Office Staff/Admin users must be able to download the official structured Excel timeline template, upload a completed `.xlsx` timeline, replace the active semester timeline, edit individual timeline entries, and trigger audit logging.
- Office Staff/Admin users must be able to add individual timeline entries to the active timeline, move entries between Research Project 1 and Research Project 2, delete obsolete entries, and see those changes reflected in the schedule, entries table, dashboards, and audit log.
- Timeline Management must use persisted backend data for summary cards, active semester schedule, timeline entries, upload results, add/edit/delete actions, and recent timeline updates/audit log when timeline backend mode is enabled.
- Timeline Management Recent Timeline Updates must display the newest audit records in pages of 10 without removing or merging audit history.
- Timeline Management must use the same P1/P2 calendar-style timeline presentation as Administration Dashboard and must not show an overflow menu action.
- Add/Edit timeline entry drawers must restrict classification to Research Project (P1) and Research Project (P2), and must not expose or submit manual status-state selection because status is derived from the entry date range.
- Semester timeline upload validation must reject missing required columns, missing required fields, invalid P1/P2 levels, invalid dates, invalid target roles, and deadline end dates before start dates.
- Semester timeline uploads must be `.xlsx` files no larger than 10 MB. Before parsing, the backend must reject malformed or corrupt ZIP containers, missing workbook structure, encrypted entries, unsafe archive paths, macro payloads, archives with more than 1,000 entries, and archives expanding beyond 50 MB.
- Timeline upload validation failures must retain the API contract `400 {"errors": ["reason"]}`, and the frontend must reject files over 10 MB before submission.
- The supported timeline upload template must use structured rows with `Level`, `Title`, `Detail`, `Action`, `Deadline Start`, `Deadline End`, `Week Label`, and `Target Roles`. `Title` is shown on the schedule label, `Detail` is shown as the description when the user opens the entry, and `Target Roles` accepts only `STUDENT`, `LECTURER`, and `OFFICE_STAFF`. `Step` and `Status` are not user-entered template columns.

## Office Staff Module Requirements

- Sidebar navigation must expose Dashboard Overview, Registry Management, FAQ Chatbot, File Management, Supervisor Appointments, Letter Generation, Announcements, Marks Entry, Panel Appointments, and Settings.
- Header notifications must route to `/notifications`, and workflow notifications must deep-link authorized users to the relevant Supervisor Appointment, Panel Appointment recommendation, or Marks record route when a record identifier is available.
- Existing Dashboard Overview behavior must remain the default authenticated landing view for every role after a normal login.
- Login, forgot-password, and reset-password flows must remain available at `/login`, `/forgot-password`, and `/reset-password?uid=...&token=...` after logout without blocking direct office-staff UI review during development.
- Production frontend hosting for clean URLs must fall back unknown frontend paths to `index.html` so direct refresh works on routes such as `/marks/records/<recordId>`.
- Office Staff/Admin Supervisor Appointment record detail and workload monitoring must be page-level routed at `/supervisor-appointments/<applicationIdOrStudentId>` and `/supervisor-appointments/workload`, with back actions returning to `/supervisor-appointments` and unknown records showing a clear not-found state.

## Lecturer Module Requirements

- When an authenticated demo user has the `Lecturer` role, Supervisor Appointments, Panel Appointments, and Marks Entry must render lecturer-focused workflows rather than office-staff administrative workflows.
- Lecturer users must land on Lecturer Dashboard Overview after login; Marks Entry remains accessible from the sidebar rather than being the automatic landing module.
- Lecturer Dashboard Overview must render a lecturer-focused dashboard instead of the office-staff administration dashboard.
- Lecturer Dashboard Overview must show the role-scoped read-only semester timeline without the office-staff Manage Timeline action.
- Lecturer Dashboard Overview must not show office-staff Records Needing Attention or Office Monitoring Tasks.
- Lecturer Dashboard Overview must show two dashboard cards: Students Under Supervision and Panel Appointment for Students.
- Lecturer Dashboard Overview must reuse the shared persisted Dashboard Action Centre for assigned Supervisor requests, selected-panel reviews, Marks tasks, and Lecturer-targeted timeline actions.
- Lecturer Supervisor Appointments must support pending supervisor request review, active supervisee detail review, and supervisor request history.
- Lecturer Supervisor Appointments must expose request history and active supervisee detail as page-level routes at `/supervisor-appointments/history` and `/supervisor-appointments/supervisees/<studentId>`, while keeping review drawers, filters, pagination, and toasts local to the component.
- Lecturer Supervisor Appointment review drawers must keep approve/reject controls and rejection reason inputs inside the scrollable drawer body so long request details do not leave decision controls fixed outside the scroll region.
- Lecturer Panel Appointments must support assigned panel task review, supervisor panel recommendation submission, and submitted recommendation review.
- Lecturer Panel Appointments must expose submitted recommendations, reviewed requests, and assignment detail as page-level routes at `/panel-appointments/submitted`, `/panel-appointments/reviewed`, and `/panel-appointments/assignments/<studentId>`, while keeping drawers, filters, pagination, and toasts local to the component.
- Selected panel lecturers must retain a read-only Reviewed Requests history containing recommendations they personally accepted or rejected, including the later Programme Coordinator outcome when available.
- Selected-panel Reviewed Requests must open as a separate page from a text-only button positioned above the Selected Panel Review Queue table.
- Lecturer Panel Assignment Detail must render backend assignment fields rather than screenshot/demo placeholders, show the academic year as `Session YYYY/YYYY`, show the complete panel workflow status timeline with recorded date-times when available, and show related documents/EE evaluation as concise no-records states until those modules are connected.
- Supervisor panel recommendation is separate from the student supervisor appointment workflow and applies only after a student already has an approved supervisor.
- A supervisor panel recommendation must contain exactly one recommended panel lecturer for the student.
- A supervisor cannot create another panel recommendation for the same student while a recommendation is Submitted to Panel, Pending Coordinator, or Approved/Confirmed.
- Panel acceptance moves directly from `SUBMITTED_TO_PANEL` to `PENDING_COORDINATOR`; the unused `ACCEPTED_BY_PANEL` state is not part of the supported workflow.
- The submitting supervisor may cancel a panel recommendation only while its status is `SUBMITTED_TO_PANEL`; cancellation requires a non-empty reason, is immediate, and creates the terminal status `CANCELLED_BY_SUPERVISOR`.
- A cancelled panel recommendation must remain in supervisor, selected-panel, Programme Coordinator, and Office Staff/Admin history as `Cancelled by Supervisor`, must leave the selected panel's active queue, must release its reserved workload, and must permit a replacement recommendation for the same student.
- Cancellation controls must never be available to the selected panel member, Programme Coordinator, Office Staff/Admin, or student, and cancellation must be rejected after any selected-panel or coordinator decision.
- A student may cancel their Supervisor Appointment request only while it is `SUBMITTED_TO_SUPERVISOR`. Cancellation requires a reason, creates terminal `CANCELLED_BY_STUDENT`, removes the request from the supervisor queue, preserves audit history, and permits a replacement request.
- Supervisor and Panel transitions must create immutable audit events containing actor, role, previous status, new status, reason, and timestamp.
- Workflow and Approval Tracking must maintain persisted audit events and stable module/record identifiers that the separate Notifications module can consume for deep links. Office Staff/Admin monitor workflows through read-only records rather than receiving every transition as part of this module.
- A supervisor may create a new recommendation for the same student only after the selected panel member rejects it or the Programme Coordinator rejects it.
- Submitted panel recommendations must route first to the selected panel member for acceptance or rejection; selected panel rejection requires a rejection reason.
- Programme Coordinator confirmation or rejection must occur only after the selected panel member accepts the recommendation.
- The supervisor who submitted a panel recommendation must see only tracking/status information for that recommendation and must not be able to approve or reject it as the selected panel member or Programme Coordinator.
- Panel recommendation review actions must be role-gated: selected panel members may decide only recommendations submitted to them, and Programme Coordinators may decide only recommendations that have passed selected-panel acceptance.
- Panel recommendation role-gating must be enforced by the backend API and database workflow, not only by frontend button visibility.
- Programme Coordinator panel appointment confirmation must use the existing separate `Programme Coordinator` login role.
- Programme Coordinators must have a dedicated dashboard using the Lecturer dashboard structure, a read-only Lecturer-scoped semester timeline, and a persisted action centre limited to Supervisor and Panel approvals in the managed programme.
- Programme Coordinator dashboard cards must show live supervisor and panel approval counts from persisted backend workflow state, scoped to the coordinator's managed programme.
- Programme Coordinator panel queues, records, dashboard counts, and decision permissions must be restricted to `Coordinator.programme_managed`.
- A Programme Coordinator without an assigned managed programme must see an explicit no-programme state, no protected panel records, and no approval actions.
- Programme Coordinator Panel Appointments must show the final-approval queue plus a searchable, status-filtered, read-only full-lifecycle records table for the managed programme, paginated at 10 rows per page.
- Programme Coordinator Panel Appointments must continue to support `/panel-appointments/recommendations/<recommendationId>` as a direct recommendation drawer link while redirecting lecturer-only panel subpages back to `/panel-appointments`.
- Programme Coordinator approve/reject actions must remain available only from the pending final-approval queue; completed and non-actionable lifecycle records must open in read-only detail mode.
- Programme Coordinators do not require a separate decision-history page because their programme-wide lifecycle table is the audit surface.
- Programme Coordinator Supervisor Appointments must show the live final-approval queue for accepted supervisor applications in the coordinator's managed programme, including approve/reject actions, mandatory in-app rejection reasons, persisted workflow audit history, loading/error states, and a clear no-pending-approvals state.
- The backend must persist student research profiles, supervisor panel recommendations, and final approved panel appointments for the lecturer-side panel workflow.
- Panel recommendation decision drawers must keep confirm/reject controls and rejection reason inputs inside the scrollable drawer body so long research details do not leave decision controls fixed outside the scroll region.
- Submitted panel recommendation detail drawers must be the supervisor tracking surface and show a request progress timeline covering recommendation submission, selected panel review, Programme Coordinator confirmation, and appointed panel status.
- Panel recommendation timelines must display recorded submission and confirmation/rejection date-times when those timestamps are available from the backend.
- Panel recommendations must not support a save-as-draft flow; supervisors submit directly to the selected panel lecturer.
- Panel workload validation must count confirmed active panel appointments plus submitted/pending nominations, and the UI must explain that this reserved workload is used before submission.
- Panel appointment APIs must keep the frontend response contract stable while resolving lecturer staff numbers, departments, and student matric numbers from the normalized role-profile tables.
- Lecturer Marks Entry must support mark-entry task review, mark-entry form access, history review, and submitted mark detail review.

## Workflow Ageing and Deadline Requirements

- Pending Supervisor and Panel approvals must expose derived `waitingSince`, `waitingDays`, and `waitingOn` metadata without storing recurring ageing records or changing immutable workflow audit events.
- Supervisor submissions wait on `SUPERVISOR` from submission; accepted Supervisor applications wait on `PROGRAMME_COORDINATOR` from the Supervisor decision.
- Panel submissions wait on `SELECTED_PANEL` from submission; accepted nominations wait on `PROGRAMME_COORDINATOR` from the selected-panel decision.
- Historical records missing a stage timestamp must fall back to the matching workflow transition and then the record update timestamp. Future or malformed waiting timestamps must display zero elapsed calendar days.
- Approved, rejected, cancelled, completed, and otherwise terminal workflow records must return null waiting metadata. Approval ageing is informational and must not be described as an SLA, due-soon state, or overdue state.
- Marks tasks and monitoring records must derive `dueAt`, `daysUntilDue`, and `deadlineState` from `EvaluationPeriod.closes_at`. The supported states are `NO_DEADLINE`, `UPCOMING`, `DUE_TODAY`, `OVERDUE`, and `COMPLETE`; submitted Marks remain locked and do not gain an approval stage.
- Timeline action metadata must be derived from persisted entry start/end dates without changing timeline persistence or audit behavior.
- `/api/dashboard/tasks/` must return at most 20 role-scoped actions while retaining its existing fields. Priority order is overdue deadlines, due-today deadlines, oldest waiting approvals, active timeline entries, then upcoming deadlines nearest first.
- Office Staff/Admin may see actions across all five owned modules. Programme Coordinators may see only managed-programme Supervisor and Panel approvals. Lecturers may see only assigned Supervisor requests, selected-panel reviews, their Marks tasks, and Lecturer timeline entries. Students may see only their own Supervisor wait, generic faculty Panel processing, and Student timeline entries.
- Student Panel payloads and actions must use `FACULTY_PROCESSING` and must not expose the selected panel, coordinator stage, recommendation ID, or internal workflow timestamps. Students without an active recommendation receive null Panel ageing metadata.
- Office Supervisor and Panel monitoring lists must provide an optional Longest waiting order while retaining their normal default order. Lecturer and Programme Coordinator approval queues default to oldest waiting first.
- Existing Supervisor and Panel CSV exports must include waiting metadata. Marks records and Lecturer Marks tasks must display persisted deadline metadata; no separate reporting subsystem is introduced.

## Workflow Analytics and Reporting Requirements

- Authenticated Office Staff/Admin, Programme Coordinator, and Lecturer users must have a read-only workflow analytics workspace at `/dashboard/reports`; Students must not receive this administrative reporting surface.
- Reports must aggregate only records already authorized for the requesting role. Office Staff/Admin may report across all programmes or one selected programme, Programme Coordinators remain restricted to their managed programme, and Lecturers remain restricted to assigned Supervisor, selected-panel, Marks, and Lecturer-targeted Timeline records.
- Optional `startDate` and `endDate` filters must use ISO dates and reject malformed or reversed ranges. Supervisor uses submission date, Panel uses submission date with creation fallback, Marks uses evaluation-period closing date with assignment fallback, and Timeline uses deadline start date.
- Supervisor and Panel reporting must include lifecycle, waiting-owner, informational age-band, and longest-waiting summaries. Age bands are descriptive calendar-day groupings and must not be presented as service levels, due-soon states, or overdue states.
- Marks reporting must retain its tracking-only model and summarize task status, deadline state, evaluator role, completion, and authorized overdue tasks. Timeline reporting must summarize current status, P1/P2 level, and target role.
- JSON reports and XLSX exports must use the same role-scoped reporting service and active filters. Export workbooks must contain only sections the requesting role can access and must not persist generated files or database records.
- Reports show the current persisted state of records selected by their reporting date; they do not reconstruct historical point-in-time snapshots or trend lines.

## Student Progress Dossier Requirements

- The system must provide a read-only progress dossier that aggregates persisted Supervisor, Panel, Marks, active Student-targeted Timeline, and workflow-audit data without creating dossier records or changing workflow state.
- Office Staff/Admin may view every student and all dossier sections. Programme Coordinators may view managed-programme students with Supervisor, Panel, and Timeline sections only. Lecturers may view only connected students, and each Supervisor, Panel, or Marks section must contain only records assigned to that lecturer.
- Students may open only their own dossier. Unauthorized and nonexistent matric numbers must return the same `404` response so the endpoint does not disclose whether another student exists.
- Student dossier payloads must omit internal Panel stages, recommendation identifiers, pending selected-panel identity, evaluator identity, marks, comments, and staff audit actors. Pending Panel work is represented only as `FACULTY_PROCESSING`.
- Dossiers must show current records before newest-first lifecycle history, reuse existing waiting/deadline derivations, and return null waiting metadata for terminal workflows.
- Dossier attention must order overdue authorized Marks tasks first, active workflow waits by longest age second, and active/upcoming Student Timeline milestones third.
- Dossier navigation metadata must use existing module, record type, and record identifier fields. Approval, rejection, cancellation, submission, printing, and export remain in their owning modules.
- Staff dossier routes use `/dashboard/progress/:studentId`; the Student self-view uses `/dashboard/progress`. The workspace remains outside the sidebar and is opened from existing workflow tables, report attention rows, and the Student Dashboard.
- Students without a research profile must still receive available Supervisor and Timeline information with empty Panel and Marks sections.
- Lecturer screens must reuse the current portal shell, sidebar, top header, typography scale, card surfaces, and shared Tailwind theme tokens so the experience remains visually consistent with the office-staff modules.
- Authenticated module pages must use the global portal footer only, avoiding duplicate page-level institutional footers inside individual modules.
- Administrative pages should avoid decorative blur-orb backgrounds and use restrained card surfaces suitable for repeated office workflows.
- Authenticated role workspaces must use consistent `rounded-2xl` card surfaces, subdued shadows, and shared brand color tokens.
- Repeated portal UI patterns such as page headers, action buttons, cards, status badges, toast notifications, tables, forms, and filter controls should use shared primitives or shared CSS classes where practical.
- Toast notifications should appear at the top-right of the viewport, below the sticky top header, and remain above app overlays.
- Irreversible confirmations such as cancellation, deletion, and final mark submission must use the shared portal confirmation modal instead of browser-native `window.confirm()` dialogs.
- Dashboard and panel appointment actions must use in-app portal toasts or inline validation instead of browser-default `alert()` popups.
- Frontend API base configuration must be driven by Vite environment variables. Global mock mode may remain only for unfinished or teammate-owned modules.
- Dashboard/Timeline, Supervisor Appointments, Panel Appointments, Marks, and Workflow/Approval Tracking must always use Django. Their services and screens must not inspect global mock mode, use module-specific backend switches, or substitute demo records after an API error.
- Owned workflow screens must expose their existing loading, retry, and authorization states when Django is unavailable or rejects a request.
- Demo data for unfinished modules must remain outside owned-module services and runtime components.
- Generated Gemini or AI Studio environment requirements are out of scope for this portal frontend and must not be required to run the app.
- Demo accounts must use clearly fictional `example.test` emails, `DEMO-*` identifiers, and demonstration-only profile data with no national identity-number patterns.
- Django demo seeding must require `DEBUG=True`, an explicit `ENABLE_DEMO_ACCOUNTS=true` opt-in, and non-blank per-role passwords supplied only through an ignored local environment file.
- Frontend demo-login controls must appear only in Vite development mode when `VITE_ENABLE_DEMO_LOGIN=true` and all per-role local passwords are configured; normal manual login must remain available otherwise.
- Production frontend builds must not contain demo passwords, testing-console markup, or testing-console copy even when demo environment variables are supplied to the build process.
- Refreshing or renaming local demo accounts must preserve existing account identities and their audit, timeline, and appointment history through an optional validated legacy-email mapping.
- Django REST APIs must require authenticated access by default. Only login, password-reset request, and password-reset confirmation may explicitly allow anonymous DRF requests; `/api/health/` remains a minimal public Django health check.
- Logout must require a valid authenticated refresh session, blacklist that refresh token, and delete its cookie.
- Backend role and record scoping is authoritative: students may access only their own records, lecturers only assigned workflow records, Programme Coordinators only their managed programme, and Office Staff/Admin-only monitoring must reject every other role.
- Letter templates are readable by every authenticated role and writable only by Office Staff/Admin or Programme Coordinator users.
- Announcements and Notifications are teammate-owned and excluded from behavioral security changes in the current core-API hardening slice.
- Login must be limited to 10 attempts per minute per client IP, password-reset requests to 5 per hour per client IP, and password-reset confirmations to 10 per hour per client IP, with environment-configurable rates.
- Authentication throttles must return HTTP `429` with `Retry-After`, and authentication screens must show a clear retry-later message.
- When `DEBUG=False`, Django startup must fail closed unless `DJANGO_SECRET_KEY` is non-placeholder, at least 50 characters long, and contains at least 5 unique characters; `DJANGO_ALLOWED_HOSTS` must be explicit and non-wildcard; and `CORS_ALLOWED_ORIGINS` must contain at least one valid HTTPS origin.
- Production requests must use HTTPS redirection, secure HttpOnly `SameSite=Strict` session and CSRF cookies, content-type sniffing protection, a same-origin referrer policy, and frame denial. Local `DEBUG=True` HTTP hosts, CORS origins, and the development secret fallback must remain available.
- Production HSTS must begin with a staged one-hour duration without subdomain coverage or preload. Raising it to one year and enabling `includeSubDomains` or preload requires verified HTTPS coverage across all subdomains.
- Forwarded-protocol trust must remain disabled by default and may be enabled only when a trusted reverse proxy strips untrusted client forwarding headers and sets `X-Forwarded-Proto` itself.
- Access tokens must default to 15 minutes, remain only in frontend memory, and authenticate normal APIs through the bearer header. They must never be stored in browser storage, URLs, or logs.
- Refresh tokens must default to 7 days, rotate on every renewal, blacklist the replaced token, and remain only in an HttpOnly `SameSite=Strict` cookie scoped to `/api/auth/`; production refresh cookies must be Secure.
- Login, refresh, and logout must require JSON requests; refresh and logout additionally require a valid refresh cookie. Missing, malformed, expired, replayed, password-invalidated, or inactive-user refresh sessions must return `401` without exposing refresh-token values.
- Password resets and account deactivation must invalidate existing access and refresh sessions. Application startup and a single authenticated `401` retry may renew through the refresh cookie without converting normal APIs to cookie authentication.
- Production must serve the React application and Django routes from one HTTPS origin through the tracked Nginx template, with `/api/` and `/admin/` proxied to Django and collected Admin assets served from `/static/`. Unknown hosts must be rejected, canonical redirects must not reflect the request Host header, and Nginx must emit the sole public HSTS header.
- Production documents must receive a CSP that permits scripts and API connections from the same origin only, prohibits inline scripts, objects, frames, workers, and media, and allowlists only Google Fonts and Unsplash images as external resources.
- CSP rollout must begin with the report-only include and move to the equivalent enforced include only after all owned role workflows complete without browser-console violations. No unauthenticated CSP collection endpoint is required in this slice.
- Production Vite builds must explicitly disable source maps and fail their security guard if emitted files contain `.map`, `sourceMappingURL`, inline executable entry scripts, demo credentials, or testing-console content. Nginx must return `404` for all `.map` paths, including maps present in collected third-party static packages.
- Inline styles remain temporarily permitted for current React dynamic layout behavior, but generated letter documents must register print behavior from the trusted application bundle instead of embedding inline scripts.
- Frontend build tooling must keep Vite in `devDependencies` only on the patched 6.x line, keep `tsx` and its transitive `esbuild` on advisory-free versions, and provide an `npm run audit:security` command that fails on any known low-or-higher vulnerability.
- Frontend routing must use patched `react-router` 8.3.0 or newer with React/React DOM 19.2.7 or newer and Node.js 22.22.0 or newer. The removed `react-router-dom` compatibility package must not be reintroduced.
- All frontend dependency paths must resolve PostCSS to 8.5.18 or newer through the package-level npm override.

## Student Module Requirements

- When an authenticated demo user has the `Student` role, shared sidebar entries must render student-focused workflows rather than office-staff administrative workflows.
- Student users must be able to access FAQ Chatbot, Supervisor Appointments, Panel Appointments, File Submission, Letter Generation, Dashboard Overview, and Settings from the sidebar.
- Student Supervisor Appointments must support viewing current supervisor details and submitting supervisor appointment applications.
- Student Supervisor Appointments must expose the new application form as `/supervisor-appointments/new` and continue opening submitted application detail from `/supervisor-appointments/<applicationId>`.
- Student Panel Appointments must support viewing pending and confirmed panel appointment states.
- Student Panel Appointments must remain rooted at `/panel-appointments`; nested panel appointment URLs that do not apply to students must redirect back to `/panel-appointments`.
- Student Panel Appointments must load panel appointment status from the persisted backend panel workflow instead of a manual test toggle.
- Student users must see a pending state until Programme Coordinator confirmation creates an active appointed panel record.
- Student users without a linked research profile must also see the pending panel appointment state instead of a hard loading error.
- After Programme Coordinator confirmation, the student Panel Appointment page must show the appointed panel member, programme, semester, research title, appointment date, and panel contact email when available.
- The confirmed student Panel Appointment view should avoid staff ID and repeated supervisor/student metadata so the module stays focused on the appointed panel.
- Student panel visibility starts immediately after Programme Coordinator confirmation; no separate Office Staff/Admin release step is required for this slice.
- Student panel appointment data must be scoped to the authenticated student so a student cannot view another student's appointed panel.
- Student File Submission must support selecting a submission category and uploading/viewing submitted research documents.
- Student Letter Generation must support selecting a letter template, previewing content, and triggering generate/print actions.
- Student Dashboard Overview must show the shared semester timeline in a read-only student context without the office-staff Manage Timeline action.
- Student Dashboard Overview must not show the top-right Active Student summary card.
- Student Dashboard Overview must keep only two status/action cards below the timeline: Supervisor and Panel Appointment.
- Student Dashboard Overview must remove Semester Progress, academic-guidelines, and Profile Status Complete panels from the dashboard.
- Student Dashboard Overview must reuse the shared semester-timeline next-actions list for timeline events targeted to Student.
- Dashboard and panel-facing demo/profile data must use only the approved programme list.
- Student screens must reuse the current portal shell, global footer, typography scale, card surfaces, and shared Tailwind theme tokens.
- Student-facing toasts, status labels, action cards, and dashboard cards must follow the same shared portal primitives used by office staff and lecturer screens.
- Cross-role table actions, pagination controls, drawer close controls, modal actions, upload actions, page headers, sub-view back headers, segmented selectors, removable tag chips, progress bars, status dots, and reusable status badges should use shared portal primitives unless the control is a highly layout-specific visual element.

## Five-Module Completion Requirements

- Supervisor Appointment applications must persist project details, proposed supervisor, private supporting-document files and immutable metadata snapshots, decisions, reasons, and timestamps.
- A student may have only one active supervisor application; rejected applications may be followed by a new application.
- The requested supervisor decides first, followed by final Programme Coordinator approval scoped to the managed programme.
- Supervisor and Panel decisions must enforce each lecturer's configured workload limit.
- Supervisor and Panel workflows must audit actor, role, action, previous status, new status, reason, and timestamp.
- Supervisor document requirements, workload limits, rubrics, and mark components must remain configurable until official rules are received.
- Office Staff/Admin must configure Supervisor application document requirements without physical deletion. Requirement codes are immutable; activation, deactivation, ordering, and content changes require audited configuration records, while each submitted application retains the code and label used at submission time.
- New Supervisor applications must fail closed when no active document requirements exist and must atomically submit multipart research data with at most one file per selected requirement, five files total, and 10 MB combined.
- Supervisor application documents accept PDF and DOCX only. Django must validate file signatures and package integrity, reject unsafe PDF actions and encrypted, traversing, macro-enabled, oversized, or malformed DOCX content, and prevent duplicate file content within one application.
- Private Supervisor files must never expose storage URLs. Authenticated attachment downloads are limited to the owning Student, proposed Supervisor, managed-programme Coordinator, and Office Staff/Admin; unauthorized and unknown files return the same not-found response.
- Historical document metadata without stored content must remain visible as `Legacy Metadata` without a download action. Rejected and cancelled applications retain their immutable documents and workflow history.
- Student, Lecturer, Coordinator, and Office Supervisor views must render only persisted application fields and documents. They must not fabricate eligibility decisions, supporting files, research content, timestamps, feedback, or appointment letters.
- Official faculty templates, academic eligibility thresholds, antivirus scanning, post-submission file replacement, Notifications/Announcements, and File Repository integration remain outside Supervisor intake until authoritative rules or teammate-owned interfaces are available.
- Evaluation task generation must create role-specific mark-entry tasks for both active Supervisor Appointments and active Panel Appointments.
- Marks Assignment must provide production Office Staff/Admin controls for selecting evaluation periods, generating missing tasks, filtering tasks by role/status, and assigning backup evaluators without raw ID prompts.
- Office Staff/Admin may add a backup/manual-override evaluator only for exception cases, with a mandatory reason and audit trail; this must not change the official supervisor or panel appointment.
- If a mark entry period is active and tasks were not manually generated, the backend must safely generate missing tasks without duplicating or overwriting existing/submitted entries.
- Marks Entry overview and monitoring must use live mark periods, task totals, and mark records rather than hardcoded submission counts.
- Dashboard and Marks Entry monitoring actions must open Mark Entry Records with the relevant status filter selected.
- Office Staff/Admin mark records must show unsubmitted tasks as `Overdue` after the evaluation period close date while preserving submitted records as `Submitted`.
- Marks Entry uses only `Not Started`, `Draft`, and `Submitted`; it has no approval workflow.
- Lecturer submission immediately locks marks.
- Authorized Office Staff/Admin users may correct or reopen submitted marks through Django Admin with a mandatory reason and before/after audit values.
- Mark totals must be recalculated by the backend and component marks must not exceed configured maximums.
- Dashboard summaries must use live Supervisor, Panel, and Marks data with role and programme scoping.

## Production Marks Management

- Marks configuration is faculty-wide and persisted. Office Staff/Admin is the only portal role allowed to create or change rubric versions, rubric components, and evaluation periods.
- Every rubric belongs to a stable version family, has a sequential version number and configurable target mark, and may reference the version it supersedes. A published-period or task-referenced version is immutable and must be cloned before further changes.
- A rubric version is ready for publication only when it has active components and their maximum marks total exactly the configured target. Components are deactivated rather than physically deleted.
- Evaluation periods follow `DRAFT`, `PUBLISHED`, `CLOSED`, and `ARCHIVED` lifecycle states. The UI derives `DRAFT`, `SCHEDULED`, `OPEN`, `CLOSED`, or `ARCHIVED` from lifecycle state and Kuala Lumpur timestamps.
- Draft periods permit configuration changes. Published periods lock their name, semester, and rubric; only a closing-time extension with a mandatory reason is permitted. Closed periods may be archived and archived periods are hidden by default.
- Publishing requires a ready rubric, a valid opening/closing range, and a unique non-archived faculty-wide name and semester. Evaluation and backup tasks may be created only for published periods that have not ended.
- Every configuration mutation records an immutable actor, action, entity, reason, before value, after value, and timestamp audit.
- Lecturer drafts and submissions are accepted only while a period is published and open. Submitted entries remain locked, duplicate submissions conflict, and authoritative totals are recalculated only from persisted component scores.
- Draft updates remove persisted optional scores omitted from the request. Submission rejects duplicate, unknown, negative, over-maximum, or missing required component scores.
- State conflicts, locked configuration, duplicate submission, and illegal lifecycle transitions return `409`; malformed input and score validation return `400`.
- Office Staff/Admin Mark Record Detail must load one persisted record by stable record ID and show assignment, student/research summary, deadline, rubric version, component scores, comments, total, lock state, overrides, and read-only correction history.
- Office Marks administration routes must fail closed in the frontend for Programme Coordinator, Lecturer, and Student users in addition to backend endpoint authorization.
- Submitted-mark reopening and direct score or comment corrections remain restricted to audited Django Admin actions. Reopening is permitted only while the period still accepts submissions; an audited correction with a mandatory reason and before/after values may be made after closure.
- Marks production screens must not ship mock records, browser-local period/rubric mutations, simulated sync controls, unsupported mark-sheet/PDF downloads, fake supporting documents, or notification dispatch behavior.
- Marks remains tracking-only with `Not Started`, `Draft`, and `Submitted`; no approval or grade-classification stage is introduced.

## Backend-Only Owned Workflow Boundary

- Appointment and Timeline service functions must call their Django endpoints directly under every Vite environment combination.
- Supervisor workload monitoring must be derived from active persisted appointments and configured supervisor limits. A Lecturer's own workload must use an authenticated, role-scoped endpoint.
- Lecturer acceptance of a Supervisor application must remain pending Programme Coordinator approval and must not create or display an active appointment until the backend creates one.
- Active-supervisee detail, panel candidates, recommendation histories, timeline semester/session metadata, and timeline dates must come from persisted API responses or explicit user input; the UI must not invent fallback identities, records, dates, or files.

## Central Academic Semester Requirements

- Dashboard/Timeline, Supervisor Appointments, Panel Appointments, Marks, and Workflow/Approval Tracking must share one faculty-wide academic-semester authority. At most one semester may have the persisted `ACTIVE` lifecycle at a time.
- Academic sessions use consecutive-year values such as `2026/2027`; terms are limited to Semester I, Semester II, or Special Semester. Non-archived semester date ranges must not overlap.
- Office Staff/Admin alone may create, edit, activate, extend, close, archive, or audit semesters. Every authenticated role may read the minimal active-semester context displayed on its dashboard.
- Semester lifecycle transitions are one-way: Draft may become Active or Archived, Active may become Closed, and Closed may become Archived. Activation, handover, extension, closure, and archival require immutable audit records and mandatory operational reasons.
- Activating a replacement semester must atomically close the previous active semester and its published Marks periods. An active semester past its end date is effectively expired and blocks new Supervisor, Panel, and Marks workflows until Office Staff closes or replaces it.
- New Supervisor applications and Panel recommendations bind to the effective active semester on the server. Clients cannot select or override this relationship; unresolved prior-semester approvals and cancellations remain actionable and are labelled as carryover records.
- Timeline versions belong to a persisted semester. Office Staff may prepare the current Timeline version for a Draft or Active semester; Closed and Archived semester Timelines are read-only. Role dashboards render only the effective active semester's current Timeline.
- Marks draft periods may be prepared for Draft or Active semesters. Publishing and task generation require the effective active semester, and the evaluation window must remain within its dates. Extending a semester never changes Marks deadlines automatically.
- Workflow Reports default to the active semester and permit authorized `all`, `unassigned`, or stable semester-code history filters. Progress dossiers retain authorized complete history.
- Historical workflow strings remain available for display, but records that cannot be linked without guessing must keep a null semester relationship and display `Legacy / Unassigned`.
- Appointment and Timeline mock datasets and legacy `VITE_USE_SUPERVISOR_BACKEND`, `VITE_USE_PANEL_BACKEND`, and `VITE_USE_TIMELINE_BACKEND` controls must not be present in source or production artifacts.

## Supervisor-to-Panel Research Profile Handoff

- New Supervisor applications require a persisted free-text Research Area in addition to the research title and abstract. Historical applications may retain a blank legacy value.
- Final Programme Coordinator approval is the authoritative point at which the system must atomically create or connect the student's research profile and create the active Supervisor appointment.
- Research profiles provisioned by approval use the Student account's matric number, name, and programme; the approved application's title, abstract, Research Area, and academic-semester label; and the approved Supervisor appointment.
- Matching unassigned legacy profiles must retain their primary keys. Unused profiles may be refreshed from the approved application, while profiles with Panel or Marks history must not have populated historical research data silently overwritten.
- Separate user-linked and matric-linked profiles, or downstream-used profiles assigned to a different Supervisor, must fail final approval with `409 Conflict` and no partial appointment, profile, approval event, or state transition.
- Panel-eligible supervisees require an active approved Supervisor appointment for the authenticated Lecturer. Panel recommendation submission must revalidate that relationship server-side and reject crafted student identifiers.
- Student Panel status must expose only public readiness states: Supervisor required, Supervisor approval pending, ready for Panel recommendation, faculty processing, or confirmed. Pending internal Panel actors and stages remain private.
- Marks task generation must resolve the profile created by Supervisor approval and continue producing separate Supervisor and Panel evaluator tasks after the respective appointments become active.
- Active-supervisee detail must provide a deep action into the existing Panel recommendation workspace with the eligible student preselected; no additional sidebar module is introduced.

## Supervisor and Panel Appointment Closure and Reassignment

- Supervisor and Panel appointments have a persisted active/ended lifecycle, controlled closure outcomes, mandatory reasons, server timestamps, actors, predecessor/successor links, and immutable lifecycle events.
- The database permits at most one active Supervisor appointment per Student and one active Panel appointment per research profile. Approved applications and recommendations remain historical approval records after an appointment ends.
- Office Staff/Admin may end any active appointment. Programme Coordinators may end only appointments in their managed programme. Direct closure supports `COMPLETED`, `WITHDRAWN`, and `OTHER`; `REPLACED` is reserved for approved handovers.
- Students request Supervisor replacement through the existing multipart application with fresh current documents and a reason. Current Supervisors request Panel replacement through the existing recommendation and approval chain.
- The incumbent remains active during review. Final Coordinator approval atomically ends it as `REPLACED`, activates the successor, updates the research-profile Supervisor when applicable, and records lifecycle events.
- Supervisor replacement preserves active Panel appointments and system-cancels the outgoing Supervisor's in-flight Panel recommendations with immutable workflow events.
- Closure retires unfinished official Marks tasks in scheduled/open periods. Draft values are retained in an immutable handover audit, submitted entries remain unchanged, and approved handovers create clean tasks for replacement evaluators.
- Retired Marks tasks remain visible in authorized history but are excluded from lecturer queues, active totals, overdue totals, reports, dashboard actions, and completion denominators.
- Monitoring, CSV, Workflow Reports, and Progress Dossiers expose authorized lifecycle metadata. Student Panel views remain redacted, and Notifications/Announcements behavior is unchanged.

## Academic Participant Lifecycle Management

- Office Staff/Admin must manage Student and Lecturer academic lifecycle through the nested `/dashboard/participant-lifecycle` workspace; no sixth sidebar module is introduced.
- Student lifecycle states are Active, Deferred, Graduated, and Withdrawn. Lecturer lifecycle states are Active, Retiring, and Retired. Every transition requires a reason, server timestamp, Office actor, immutable audit, and transactional side effects.
- Deferred Students retain active appointments and read-only historical access, cannot start or advance Supervisor/Panel workflows, and have unfinished Marks tasks paused and excluded from operational queues, reports, overdue counts, and completion denominators.
- Reactivation resumes paused Marks tasks only when their original period still accepts submissions and the relevant appointment remains active; otherwise those tasks are retired with immutable draft/comment snapshots.
- Withdrawal atomically cancels pending workflows, ends active appointments as Withdrawn, retires unfinished Marks tasks, and preserves submitted Marks and all history. Graduation is blocked by unresolved approvals or unfinished operational Marks tasks, then completes remaining active appointments and preserves read-only access.
- Retiring Lecturers remain able to resolve existing decisions but are excluded from all new Supervisor, Panel, backup-evaluator, and Marks-task assignments in both candidate queries and direct-ID validation.
- Final Lecturer retirement requires no active appointments, assigned pending decisions, or managed Programme Coordinator responsibility. It retires remaining unfinished tasks, disables login, revokes refresh sessions, and is terminal in the portal.
- Student and Lecturer lifecycle fields cannot be edited through ordinary Django Admin forms because that would bypass domain side effects. Immutable lifecycle and task audits remain readable in Django Admin.
- Office Workflow Reports include participant lifecycle counts and Deferred/Retiring attention records. Internal dossiers include full lifecycle reason/actor/audit data; Student self-view exposes only public status and effective date.
- `docs/Functional Requirements.pdf` and `docs/Use Case Description.pdf` are unchanged binaries. Their confirmation-letter content and older scope wording require later revision from editable academic source files.
- Co-supervisor support remains deferred until faculty rules define primary/co-supervisor approval, workload, Panel nomination, and Marks responsibilities.

## Workflow Data Quality and Reconciliation Centre

- Office Staff/Admin must have a live scan of persisted Dashboard/Timeline, Supervisor, Panel, Marks, and Workflow Tracking relationships at `/dashboard/workflow-reconciliation`; no issue-status table or sixth sidebar module is introduced.
- Each issue has a stable identifier, current-state fingerprint, module, severity (`BLOCKING` or `WARNING`), repairability (`REPAIRABLE` or `REVIEW_REQUIRED`), affected identifiers, dependencies, and navigation metadata.
- Every repair requires a fresh preview, matching fingerprint, explicit reason, individual confirmation, current-state validation, row locking, and one immutable audit containing actor, action, before/after values, fingerprint, and affected records. Changed or resolved issues return `409 Conflict`.
- Coordinator scope comes only from `Coordinator.programme_managed` after the Coordinator role gate. A missing profile or blank programme may be repaired only for an existing Lecturer account with Coordinator access and a programme represented by persisted Students.
- Legacy semester relationships may be assigned only when persisted labels and dates identify one non-conflicting semester. Historical free-text values remain unchanged; ambiguous records stay `Legacy / Unassigned`.
- Exact-matric unassigned research profiles may be linked only without competing profiles or downstream Panel/Marks history. Profile Supervisor synchronization requires exactly one authoritative active Supervisor appointment.
- Missing approved Supervisor or Panel handoffs require persisted Coordinator actor/date metadata and valid current identity, programme, semester, participant, workload, appointment, and uniqueness checks. Original approval attribution and date are retained while the present repair is audited separately.
- Unfinished Marks tasks may be paused, resumed, retired with snapshots, or generated idempotently. Submitted Marks, evaluator attribution, immutable workflow events, and downstream histories must never be rewritten.
- Role/profile mismatches, downstream-used identity conflicts, and appointment source/replacement-lineage inconsistencies are review-required and expose no Apply action.
- Office Dashboard and Workflow Reports expose reconciliation counts and blocking attention links. Coordinator, Lecturer, and Student users cannot access reconciliation list, preview, apply, or audit endpoints.

## Lecturer Capacity and Availability Management

- Supervisor and Panel capacity must become semester-specific, versioned, role-specific, and Office-configurable through a workspace outside the sidebar.
- A semester cannot activate until one complete capacity plan is published for every lifecycle-Active Lecturer who holds a Supervisor or Panel role.
- Published plans are immutable. Active-semester changes require a new Draft version and atomic publication/supersession with a mandatory reason and immutable audit.
- Office may record separate Supervisor and Panel unavailability windows within semester dates. Existing appointments remain active; new submissions and final activation must respect effective availability.
- Reducing capacity below current workload preserves existing appointments, exposes `OVER_CAPACITY`, and blocks new assignments until load falls below the limit.
- The shared read-only resolver must apply deterministic `INELIGIBLE`, `NOT_CONFIGURED`, `TEMPORARILY_UNAVAILABLE`, `OVER_CAPACITY`, `FULL`, and `AVAILABLE` precedence. Supervisor load counts active appointments globally; Panel load separately counts global active appointments and submitted/pending reservation recommendations. Zero is a valid limit, and resolution never changes existing workflow or appointment state.
- Candidate queries and final mutation endpoints must use this same authoritative capacity resolver. Students receive only public selectability and, when the final state is `TEMPORARILY_UNAVAILABLE`, the applicable availability end date. Every other state returns a null public availability date, and internal availability reasons must not appear in resolutions or conflict messages.
- New semesters may copy the previous published plan into Draft, but Office must review and publish it. Legacy global limits seed only documented migration baselines and are not authoritative for new semester-bound workflows.
- Capacity plan services create blank Drafts, copy only currently eligible source entries from a prior Published plan, and clone a current Published or Superseded same-semester source into the next version. Newly eligible Lecturers and newly acquired roles remain explicit publication blockers instead of receiving guessed limits; ineligible historical source entries and availability windows are not copied.
- Publication requires a non-blank reason and complete role-aligned coverage for every lifecycle-Active Lecturer with a Supervisor or Panel profile. It atomically supersedes any current Published plan, publishes the target Draft, and rolls back every lifecycle and audit change if validation or persistence fails. Zero limits and reductions below current load are valid and never alter appointments or workflows.
- Availability services require a lifecycle-Active Lecturer with the requested role, ordered semester-contained dates, a non-blank reason, and no overlapping active same-role window. Supervisor and Panel windows remain independent. Cancellation is append-only, requires its own reason, preserves the original dates/reason, and rejects stale or repeated cancellation.
- Every plan creation/copy, Draft entry save, publication/supersession, and availability creation/cancellation records an immutable actor-attributed audit with deterministic JSON-safe before/after snapshots and affected plan, semester, Lecturer, and window identifiers.
