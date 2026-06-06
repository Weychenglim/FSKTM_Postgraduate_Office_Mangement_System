# Architecture and Coding Design

## Tech Stack

- React 19 with TypeScript
- React type declarations through `@types/react` and `@types/react-dom` for editor and `tsc` support.
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
- `src/components/SettingsView.tsx` implements the Settings module (profile summary, contact details, password change, and notification preferences) and is routed for every role.
- `src/components/NotificationsAnnouncements.tsx` is the notification-bell view, split into Announcements and Notifications tabs (the feed is split by the backend `isAnnouncement` flag).
- `src/context/NotificationsContext.tsx` is the shared notifications store; it feeds both the bell badge and the bell view.
- Existing appointment and marks-entry modules remain in their own component files under `src/components`.

## Backend Data Model

- `accounts.User` is the login superclass (email, role discriminator, phone, flags). Role-specific data lives in one-to-one subtype "profile" tables that share the user's primary key: `Student`, `OfficeStaff`, and `Lecturer`. `Coordinator`, `Supervisor`, and `Panel` are one-to-one specializations of `Lecturer` (overlapping — a lecturer may hold several).
- `User.to_public_dict()` reassembles the flat shape the frontend `DemoUser` expects from these profile tables, so the auth API contract is unchanged.
- The `letters` and `announcements` apps own the letter-template, announcement, and per-recipient notification tables.
- The full user/role ER diagram lives at `docs/erd/01-user-roles.md`; `docs/erd/` is the home for further ER diagrams as more modules are modeled.

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

## Testing Strategy

- Run `npm run lint` for TypeScript compilation checks.
- Run `npm run build` for production build verification.
- Start the Vite dev server and smoke-test Dashboard Overview plus each newly routed office-staff module after UI changes.
