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
- `src/components/TimelineManagement.tsx` implements the dashboard timeline management sub-view.
- `src/components/StudentRegistry.tsx` implements registry management and composes staff/lecturer registry screens.
- `src/components/FileRepository.tsx` implements file management and composes the upload document drawer.
- `src/components/AcademicFAQEditor.tsx` implements FAQ maintenance.
- `src/components/LetterTemplateManagement.tsx` implements letter template workflows.
- `src/components/AnnouncementManagement.tsx` implements announcement maintenance.
- `src/components/NotificationsAnnouncements.tsx` implements notification review from the top header.
- `src/components/ForgotPasswordFlow.tsx` implements the unauthenticated password recovery view.
- Existing appointment and marks-entry modules remain in their own component files under `src/components`.
- `src/components/PanelAppointmentManagement.tsx` uses a desktop two-column grid where the search/filter card and records table stay in the left column while attention and workload widgets span the right column.

## Navigation Pattern

The app currently uses local React state rather than a route library.

- `activeSidebarItem` selects the main portal module.
- `currentSubView` selects sub-views inside Marks Entry.
- `dashboardSubView` selects Dashboard Overview sub-views such as `overview` and `timeline`.
- `authView` selects the unauthenticated `login` or `forgot` password view after logout.
- Header notification actions call back into `App.tsx` and set `activeSidebarItem` to `Notifications & Announcements`.

## Coding Conventions

- Components are functional React components.
- UI state is local to the owning component unless shared navigation is required.
- Shared navigation callbacks are passed down as props.
- Styling follows the existing Tailwind-heavy component pattern.
- Generated office-staff module components are merged selectively into the current app rather than replacing the whole frontend folder.
- The authenticated development default remains the office staff Dashboard Overview to support fast UI review.

## Testing Strategy

- Run `npm run lint` for TypeScript compilation checks.
- Run `npm run build` for production build verification.
- Start the Vite dev server and smoke-test Dashboard Overview plus each newly routed office-staff module after UI changes.
