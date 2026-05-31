# Architecture and Coding Design

## Tech Stack

- React 19 with TypeScript
- Vite for development and production builds
- Tailwind CSS utility classes
- Lucide React icons
- Motion for animated drawer transitions

## Application Structure

- `src/main.tsx` mounts the React app.
- `src/App.tsx` owns the current demo authentication state, sidebar navigation state, and top-level module routing.
- `src/components/AppLayout.tsx` provides the authenticated portal layout.
- `src/components/Sidebar.tsx` defines the office staff sidebar navigation labels.
- `src/components/AdministrationDashboard.tsx` implements the Dashboard Overview module.
- `src/components/DashboardTimeline.tsx` implements the shared semester timeline and accepts `showManageTimeline` so office staff can manage timelines while students see a read-only dashboard timeline.
- `src/components/PortalPrimitives.tsx` provides shared portal primitives for page headers, cards, buttons, status badges, and toast notifications.
- `src/components/TimelineManagement.tsx` implements the dashboard timeline management sub-view.
- `src/components/StudentRegistry.tsx` implements registry management and composes staff/lecturer registry screens.
- `src/components/FileRepository.tsx` implements file management and composes the upload document drawer.
- `src/components/AcademicFAQEditor.tsx` implements FAQ maintenance.
- `src/components/LetterTemplateManagement.tsx` implements letter template workflows.
- `src/components/AnnouncementManagement.tsx` implements announcement maintenance.
- `src/components/NotificationsAnnouncements.tsx` implements notification review from the top header.
- `src/components/ForgotPasswordFlow.tsx` implements the unauthenticated password recovery view.
- `src/components/LecturerSupervisorAppointments.tsx` implements the lecturer supervisor workspace and composes supervisor history/detail screens.
- `src/components/LecturerPanelAppointments.tsx` implements the lecturer panel workspace and composes recommendation/detail screens.
- `src/components/LecturerMarksEntry.tsx` implements the lecturer mark-entry workspace and composes mark-entry form/history/detail screens.
- `src/components/StudentFAQChatbot.tsx` implements the student FAQ support workflow.
- `src/components/StudentSupervisorAppointment.tsx` implements student supervisor appointment viewing and composes the application screen.
- `src/components/StudentPanelAppointment.tsx` implements student panel appointment viewing.
- `src/components/StudentFileSubmission.tsx` implements student research document submission.
- `src/components/StudentLetterGeneration.tsx` implements student letter request, preview, and print workflows.
- `src/components/StudentDashboard.tsx` implements the student Dashboard Overview, including the read-only semester timeline, student status cards, next-action guidance, semester progress, support shortcut, and profile status.
- Existing appointment and marks-entry modules remain in their own component files under `src/components`.
- `src/components/PanelAppointmentManagement.tsx` uses a desktop two-column grid where the search/filter card and records table stay in the left column while attention and workload widgets span the right column.
- `src/index.css` contains shared Tailwind theme extensions for generated module color utilities, subtle shadows, backdrop blur, page headings, cards, links, and data-table primitives.
- `src/index.css` also defines `brand-navy` and related brand tokens so authenticated modules avoid repeated arbitrary hex color utilities.
- `src/index.css` defines shared table, card, form-control, filter-toolbar, icon-button, and drawer layout classes for repeated generated UI patterns that need custom layouts.

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
- Module page titles should use `.page-title` and `.page-subtitle` from `src/index.css`.
- Shared module widgets such as `DashboardTimeline` should expose small configuration props for role-specific behavior instead of duplicating near-identical UI for each role.
- New authenticated module UI should prefer `PortalPrimitives` and shared CSS classes before introducing bespoke buttons, badges, cards, toasts, filters, forms, drawer footers, modal controls, or table styling.
- Shared form components (`FormInput`, `FormSelect`, `FormTextarea`) and legacy local action/status helpers should delegate to portal primitives or shared CSS classes so backend validation, loading, disabled, and status states remain visually consistent across roles.

## Testing Strategy

- Run `npm run lint` for TypeScript compilation checks.
- Run `npm run build` for production build verification.
- Start the Vite dev server and smoke-test Dashboard Overview plus each newly routed office-staff module after UI changes.
