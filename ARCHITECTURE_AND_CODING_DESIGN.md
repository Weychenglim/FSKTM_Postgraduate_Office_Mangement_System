# Architecture and Coding Design

## Tech Stack

- React 19 with TypeScript
- React type declarations through `@types/react` and `@types/react-dom` for editor and `tsc` support.
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

- `src/main.tsx` mounts the React app.
- `src/App.tsx` owns the current demo authentication state, sidebar navigation state, and top-level module routing.
- `src/components/AppLayout.tsx` provides the authenticated portal layout.
- `src/components/Sidebar.tsx` defines the office staff sidebar navigation labels.
- `src/components/AdministrationDashboard.tsx` implements the Dashboard Overview module.
- `src/components/DashboardTimeline.tsx` implements the shared semester timeline and accepts `showManageTimeline` so office staff can manage timelines while students see a read-only dashboard timeline.
- `src/components/TimelineCalendar.tsx` provides the shared P1/P2 month-lane calendar-style timeline display used by Administration Dashboard and Timeline Management, including one row per event, day-proportional date bars across month columns, readable wrapping event labels without inline date text, an empty P2 state when P2 entries are not uploaded yet, and a details modal when a timeline label is clicked.
- `src/components/PortalPrimitives.tsx` provides shared portal primitives for page headers, cards, buttons, status badges, segmented controls, removable tags, progress bars, status dots, and toast notifications.
- `src/components/PortalPrimitives.tsx` also centralizes common status-to-badge tone mapping through `getStatusBadgeTone`, so tables, workload views, upload panels, lecturer cards, and shared status chips avoid duplicated color logic.
- `src/components/TimelineManagement.tsx` implements the dashboard timeline management sub-view.
- `src/components/SettingsView.tsx` implements the Settings module (profile summary, contact details, password change, and notification preferences) and is routed for every role.
- `src/components/NotificationsAnnouncements.tsx` is the notification-bell view, split into Announcements and Notifications tabs (the feed is split by the backend `isAnnouncement` flag).
- `src/context/NotificationsContext.tsx` is the shared notifications store; it feeds both the bell badge and the bell view.
- Timeline add/edit drawers keep timeline classification limited to P1/P2 and derive the saved status from the selected date range instead of offering manual status controls.
- `src/services/timelineApi.ts` connects the dashboard timeline UI to `/api/dashboard/timeline/active/`, `/api/dashboard/timeline/template/`, `/api/dashboard/timeline/upload/`, `/api/dashboard/timeline/entries/<id>/`, and `/api/dashboard/tasks/` when frontend mock mode is disabled.
- Existing appointment and marks-entry modules remain in their own component files under `src/components`.

## Backend Data Model

- `accounts.User` is the login superclass (email, role discriminator, phone, flags). Role-specific data lives in one-to-one subtype "profile" tables that share the user's primary key: `Student`, `OfficeStaff`, and `Lecturer`. `Coordinator`, `Supervisor`, and `Panel` are one-to-one specializations of `Lecturer` (overlapping — a lecturer may hold several).
- `User.to_public_dict()` reassembles the flat shape the frontend `DemoUser` expects from these profile tables, so the auth API contract is unchanged.
- The `letters` and `announcements` apps own the letter-template, announcement, and per-recipient notification tables.
- The full user/role ER diagram lives at `docs/erd/01-user-roles.md`; `docs/erd/` is the home for further ER diagrams as more modules are modeled.
- `src/components/LecturerPanelAppointments.tsx` is role-aware: Lecturer users see supervisor recommendation, selected-panel review queue, and their confirmed panel assignments; Programme Coordinator users see the panel recommendation confirmation queue.
- `src/components/SubmittedRecommendationsPage.tsx` and `src/components/RecommendationDetailsDrawer.tsx` are the supervisor-facing panel recommendation tracking surface; the drawer renders the same confirmation route as the review drawer and uses backend workflow timestamps when available.
- `src/components/StudentPanelAppointment.tsx` loads the authenticated student's panel appointment view from the appointments service and renders either the pending Programme Coordinator confirmation state or the confirmed appointed-panel details.
- `src/services/appointmentsApi.ts` connects the lecturer-side panel workflow to Django endpoints when `VITE_USE_MOCKS=false` while keeping mock mode available.
- `src/services/appointmentsApi.ts` uses `VITE_USE_PANEL_BACKEND` so the panel workflow can persist to Django even when the broader frontend remains in mock mode.
- `src/services/appointmentsApi.ts` exposes `getStudentPanelAppointment()` for the student panel view, with mock fallback available when panel backend mocks are enabled.
- Backend `appointments` app owns `StudentResearchProfile`, `PanelRecommendation`, and `PanelAppointment` persistence plus role-gated DRF endpoints under `/api/appointments/panel/`.
- Backend `dashboard` app owns `SemesterTimeline`, `SemesterTimelineEntry`, and `TimelineAuditLog` persistence plus role-gated DRF endpoints under `/api/dashboard/`.
- Dashboard timeline upload uses a structured Excel workbook parsed with `openpyxl`; upload replacement deactivates the previous active timeline, creates the new active timeline and entries in one transaction, and records an audit log.
- Dashboard timeline entry patching is Office Staff/Admin-only and records an audit log for each saved entry change.
- Active timeline retrieval is available to every authenticated role and returns a stable empty payload with `No timeline available at now` when no active timeline exists.
- Dashboard monitoring tasks are exposed through `/api/dashboard/tasks/`; the first backend-backed task set focuses Office Staff/Admin timeline ownership tasks and preserves frontend static monitoring fallbacks.
- The `PanelRecommendation` database model enforces the one-active-recommendation-per-student rule with a conditional unique constraint, mirrors the frontend lifecycle status contract, and records submission, selected-panel decision, and Programme Coordinator decision timestamps for timeline display.
- Panel workload validation is centralized in the appointments domain: reserved workload is confirmed active panel appointments plus submitted/pending nominations, exposed through `/api/appointments/panel/candidates/`, and enforced again during recommendation creation.
- The student-facing endpoint `/api/appointments/panel/student/` is authenticated and role-gated to `Student`; it resolves the `StudentResearchProfile` for `request.user` and returns either pending state data or confirmed active `PanelAppointment` details, falling back to a pending state for valid student accounts without a linked research profile.

## Navigation Pattern

The app currently uses local React state rather than a route library.

- `activeSidebarItem` selects the main portal module.
- `currentSubView` selects sub-views inside Marks Entry.
- `dashboardSubView` selects Dashboard Overview sub-views such as `overview` and `timeline`.
- `authView` selects the unauthenticated `login` or `forgot` password view after logout.
- Header notification actions call back into `App.tsx` and set `activeSidebarItem` to `Notifications & Announcements`.
- `currentUser.role` controls whether shared sidebar entries render office-staff, lecturer, or student workflows. For lecturer users, `Marks Entry`, `Supervisor Appointments`, and `Panel Appointments` route to lecturer-specific components. For student users, `FAQ Chatbot`, `Supervisor Appointments`, `Panel Appointments`, `File Management`, and `Letter Generation` route to student-specific components.
- Office staff/admin users still land on `Dashboard Overview`; lecturer users land on `Marks Entry` after login; student users land on the student Dashboard Overview workspace.
- `Sidebar` filters visible navigation items by active role while preserving the responsive drawer behavior from the current app shell.

## Coding Conventions

- Components are functional React components.
- UI state is local to the owning component unless shared navigation is required.
- Shared navigation callbacks are passed down as props.
- Styling follows the existing Tailwind-heavy component pattern.
- New dashboard components are imported into the current app rather than replacing the whole frontend folder.
- Panel recommendation backend permissions are endpoint-enforced: supervisors can create/list their own recommendations, selected panel lecturers can accept/reject only assigned recommendations, and Programme Coordinators can confirm/reject only pending coordinator recommendations.
- Student panel appointment permissions are endpoint-enforced: only authenticated Student users can call the student panel endpoint, and the backend only returns the profile and appointed panel linked to the logged-in user.
- Semester timeline backend permissions are endpoint-enforced: all authenticated users can read the active timeline, while only Office Staff/Admin users can download templates, upload replacements, or patch timeline entries.

## Testing Strategy

- Run `npm run lint` for TypeScript compilation checks.
- Run `npm run build` for production build verification.
- Run `python manage.py test` for backend workflow and permission checks.
- Start the Vite dev server and smoke-test Dashboard Overview plus each newly routed office-staff module after UI changes.
