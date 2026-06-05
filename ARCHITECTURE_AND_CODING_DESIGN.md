# Architecture and Coding Design

## Tech Stack

- React 19 with TypeScript
- Vite for development and production builds
- Tailwind CSS utility classes
- Lucide React icons
- Motion for animated drawer transitions

## Repository Layout

- Project root is the workspace entry point and contains the three mandatory governance documents.
- `frontend/` contains the Vite React application, including `src/`, `index.html`, `vite.config.ts`, `tsconfig.json`, `package.json`, `package-lock.json`, `metadata.json`, and the frontend `.env.example`.
- `frontend/.env.example` documents only public `VITE_` variables. A frontend `.env` file is optional unless local overrides are needed.
- `backend/` contains the Django backend, including `manage.py`, `config/`, `accounts/`, `requirements.txt`, `README.md`, and the backend `.env.example`.
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
- `src/components/PortalPrimitives.tsx` provides shared portal primitives for page headers, cards, buttons, status badges, segmented controls, removable tags, progress bars, status dots, and toast notifications.
- `src/components/PortalPrimitives.tsx` also centralizes common status-to-badge tone mapping through `getStatusBadgeTone`, so tables, workload views, upload panels, lecturer cards, and shared status chips avoid duplicated color logic.
- `src/components/TimelineManagement.tsx` implements the dashboard timeline management sub-view.
- `src/components/StudentRegistry.tsx` implements registry management and composes staff/lecturer registry screens.
- `src/components/FileRepository.tsx` implements file management and composes the upload document drawer.
- `src/components/AcademicFAQEditor.tsx` implements FAQ maintenance.
- `src/components/LetterTemplateManagement.tsx` implements letter template workflows.
- `src/components/AnnouncementManagement.tsx` implements announcement maintenance.
- `src/components/NotificationsAnnouncements.tsx` implements notification review from the top header.
- `src/components/ForgotPasswordFlow.tsx` implements the unauthenticated password recovery view.
- `src/components/LecturerSupervisorAppointments.tsx` implements the lecturer supervisor workspace and composes supervisor history/detail screens.
- `src/components/LecturerSupervisorAppointments.tsx` uses a single scrollable drawer body for supervisor request details, approve/reject controls, and rejection reason input; only the drawer header stays outside the scroll flow.
- `src/components/LecturerPanelAppointments.tsx` implements the lecturer panel workspace and composes recommendation/detail screens.
- `src/components/LecturerPanelAppointments.tsx` owns the mock-backed supervisor panel recommendation submission and tracking UI. The supervisor table is read-only for approval decisions so supervisors cannot decide their own recommendations as selected panel members or Programme Coordinators.
- `src/components/LecturerPanelAppointments.tsx` includes a panel recommendation review drawer patterned after the supervisor appointment drawer, with decision controls and rejection reason fields rendered inside the scrollable drawer body for reviewer contexts.
- `src/components/LecturerPanelAppointments.tsx` maps panel recommendation lifecycle statuses into a drawer progress timeline so submitted, accepted, rejected, pending coordinator, and approved states are visible in the same flow view.
- `src/components/LecturerMarksEntry.tsx` implements the lecturer mark-entry workspace and composes mark-entry form/history/detail screens.
- `src/components/StudentFAQChatbot.tsx` implements the student FAQ support workflow.
- `src/components/StudentSupervisorAppointment.tsx` implements student supervisor appointment viewing and composes the application screen.
- `src/components/StudentPanelAppointment.tsx` implements student panel appointment viewing.
- `src/components/StudentFileSubmission.tsx` implements student research document submission.
- `src/components/StudentLetterGeneration.tsx` implements student letter request, preview, and print workflows.
- `src/components/StudentDashboard.tsx` implements the student Dashboard Overview, including the read-only semester timeline, student status cards, next-action guidance, semester progress, support shortcut, and profile status.
- Existing appointment and marks-entry modules remain in their own component files under `src/components`.
- `src/components/PanelAppointmentManagement.tsx` uses a responsive records-first grid where the search/filter card and records table get a wider desktop column while attention and workload widgets sit in a narrower side column on wide screens and move below the table on narrower desktops.
- `src/index.css` contains shared Tailwind theme extensions for generated module color utilities, subtle shadows, backdrop blur, page headings, cards, links, and data-table primitives.
- `src/index.css` also defines `brand-navy` and related brand tokens so authenticated modules avoid repeated arbitrary hex color utilities.
- `src/index.css` defines shared table, card, form-control, filter-toolbar, icon-button, and drawer layout classes for repeated generated UI patterns that need custom layouts.
- `src/services/apiClient.ts` centralizes HTTP configuration. It reads `VITE_API_BASE_URL`, `VITE_USE_MOCKS`, and `VITE_MOCK_LATENCY_MS` from Vite env and defaults to mock mode until backend endpoints are ready.
- `src/vite-env.d.ts` defines the Vite env variables used by the frontend.
- `src/utils/panelRecommendationWorkflow.ts` centralizes the supervisor panel recommendation lifecycle labels, duplicate-blocking rule, role-gated review permissions, approval transitions, and selected-panel rejection reason validation so UI components use one status policy.
- `src/mocks` contains shared demo fixtures for dashboard attention rows, student next actions, appointments, mark records, rubric rows, file documents, announcements, letters, lecturers, and timeline imports.
- `src/types` contains shared domain models so role modules can move from demo data to service/API responses without changing component contracts.

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
- Generated office-staff module components are merged selectively into the current app rather than replacing the whole frontend folder.
- Generated lecturer module components are merged selectively into the current app rather than replacing the current office-staff application shell.
- Generated student module components are merged selectively into the current app rather than replacing the current formatted application shell.
- The authenticated development default remains the office staff Dashboard Overview to support fast UI review.
- The portal header receives `currentUser` display data from `App.tsx` so the visible identity matches the active demo role.
- Authenticated modules rely on the single global footer in `AppLayout`; individual module footers are avoided to keep institution text, links, and spacing consistent.
- Office-staff, lecturer, and student module card surfaces use the shared rounded-2xl / `shadow-3xs` visual language instead of generated arbitrary radius and shadow values.
- Auth screens intentionally keep their larger standalone card treatment and stronger sign-in/recovery visual hierarchy.
- Module and sub-view page titles should use the shared `PageHeader` primitive, which owns `.page-title`, `.page-subtitle`, back-link layout, and header action alignment.
- Shared module widgets such as `DashboardTimeline` should expose small configuration props for role-specific behavior instead of duplicating near-identical UI for each role.
- New authenticated module UI should prefer `PortalPrimitives` and shared CSS classes before introducing bespoke buttons, badges, cards, toasts, filters, forms, drawer footers, modal controls, or table styling.
- Shared action controls should use `PortalButton` for primary, secondary, soft, danger, ghost, icon, drawer, modal, pagination, and row-level actions. Segmented controls, removable tags, permission switches, progress bars, status dots, and reusable status badges should use the shared primitives or the shared `ToggleSwitch`; only highly layout-specific timeline, carousel, navigation, avatar, or flow markers should remain local.
- Shared form components (`FormInput`, `FormSelect`, `FormTextarea`) and legacy local action/status helpers should delegate to portal primitives or shared CSS classes so backend validation, loading, disabled, and status states remain visually consistent across roles.
- Components should import backend-shaped records from `src/mocks` or `src/services`; component-local arrays should be limited to UI-only controls such as month labels, filter options, decorative step labels, or icon/style mappings.
- Panel recommendation backend/database integration is deferred until the UI/mock workflow is accepted; the future API should preserve the same lifecycle statuses and one-active-recommendation-per-student rule.
- Backend authorization for panel recommendations must mirror the frontend role gate: supervisors can create and track, selected panel lecturers can accept/reject their assigned nomination, and Programme Coordinators can approve/reject only after selected-panel acceptance.
- Do not add Gemini-specific dependencies, metadata capabilities, or env variables unless a future requirement explicitly adds AI functionality.

## Testing Strategy

- Run `npm run lint` for TypeScript compilation checks.
- Run `npm run build` for production build verification.
- Start the Vite dev server and smoke-test Dashboard Overview plus each newly routed office-staff module after UI changes.
