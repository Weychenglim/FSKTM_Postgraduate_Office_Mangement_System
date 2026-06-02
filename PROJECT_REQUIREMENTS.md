# Project Requirements

## Product Scope

The application is an FSKTM postgraduate management system frontend for postgraduate administrative workflows.

## Main Roles

- Office Staff/Admin
- Student
- Lecturer, including supervisor and panel responsibilities

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
- Marks and evaluation management UI for mark entry period configuration, rubric management, evaluation task assignment, submission monitoring, and mark records.
- Supervisor and panel appointment management UI for appointment status and workload monitoring.
- Lecturer workspace UI for supervisor appointment requests, active supervisees, panel assignment details, recommendation submission, assigned mark-entry tasks, mark-entry forms, and submitted-mark review.
- Student workspace UI for FAQ support, supervisor appointment viewing/application, panel appointment viewing, file submission, letter generation, and student dashboard shortcuts.
- Panel appointment records must appear directly below the search/filter controls on desktop layouts, with attention and workload widgets remaining in the right-side column.
- Panel appointment records should fit the desktop records card without requiring a horizontal scrollbar by using a wider records column, fixed table layout, and wrapped cell content.

## Dashboard Requirements

- `Dashboard Overview` must render a real administration dashboard instead of a placeholder.
- The dashboard must show semester timeline status, key administrative summary cards, records needing attention, monitoring tasks, and dashboard actions.
- Office staff must be able to open timeline management from the dashboard and return to the dashboard.
- Dashboard actions must route to existing modules such as Supervisor Appointments, Panel Appointments, and Marks Entry without breaking those modules.

## Office Staff Module Requirements

- Sidebar navigation must expose Dashboard Overview, Registry Management, FAQ Chatbot, File Management, Supervisor Appointments, Letter Generation, Announcements, Marks Entry, Panel Appointments, and Settings.
- Header notifications must route to the Notifications & Announcements view.
- Existing Dashboard Overview behavior must remain the default authenticated landing view.
- Login and forgot-password flows must remain available after logout without blocking direct office-staff UI review during development.

## Lecturer Module Requirements

- When an authenticated demo user has the `Lecturer` role, Supervisor Appointments, Panel Appointments, and Marks Entry must render lecturer-focused workflows rather than office-staff administrative workflows.
- Lecturer Supervisor Appointments must support pending supervisor request review, active supervisee detail review, and supervisor request history.
- Lecturer Panel Appointments must support assigned panel task review, panel recommendation submission, and submitted recommendation review.
- Lecturer Marks Entry must support mark-entry task review, mark-entry form access, history review, and submitted mark detail review.
- Lecturer screens must reuse the current portal shell, sidebar, top header, typography scale, card surfaces, and shared Tailwind theme tokens so the experience remains visually consistent with the office-staff modules.
- Authenticated module pages must use the global portal footer only, avoiding duplicate page-level institutional footers inside individual modules.
- Administrative pages should avoid decorative blur-orb backgrounds and use restrained card surfaces suitable for repeated office workflows.
- Authenticated role workspaces must use consistent `rounded-2xl` card surfaces, subdued shadows, and shared brand color tokens.
- Repeated portal UI patterns such as page headers, action buttons, cards, status badges, toast notifications, tables, forms, and filter controls should use shared primitives or shared CSS classes where practical.
- Frontend API configuration must be driven by Vite environment variables so mock mode and backend base URL can change without code edits.
- Backend-shaped demo data should live in shared `src/mocks` and `src/services` modules rather than inside page components.
- Generated Gemini or AI Studio environment requirements are out of scope for this portal frontend and must not be required to run the app.

## Student Module Requirements

- When an authenticated demo user has the `Student` role, shared sidebar entries must render student-focused workflows rather than office-staff administrative workflows.
- Student users must be able to access FAQ Chatbot, Supervisor Appointments, Panel Appointments, File Submission, Letter Generation, Dashboard Overview, and Settings from the sidebar.
- Student Supervisor Appointments must support viewing current supervisor details and submitting supervisor appointment applications.
- Student Panel Appointments must support viewing pending and confirmed panel appointment states.
- Student File Submission must support selecting a submission category and uploading/viewing submitted research documents.
- Student Letter Generation must support selecting a letter template, previewing content, and triggering generate/print actions.
- Student Dashboard Overview must show the shared semester timeline in a read-only student context without the office-staff Manage Timeline action.
- Student Dashboard Overview must provide useful student status/action cards below the timeline, including supervisor status, panel appointment status, file submission reminders, letter readiness, next student actions, semester progress, FAQ support, and profile status.
- Student screens must reuse the current portal shell, global footer, typography scale, card surfaces, and shared Tailwind theme tokens.
- Student-facing toasts, status labels, action cards, and dashboard cards must follow the same shared portal primitives used by office staff and lecturer screens.
- Cross-role table actions, pagination controls, drawer close controls, modal actions, upload actions, page headers, sub-view back headers, segmented selectors, removable tag chips, progress bars, status dots, and reusable status badges should use shared portal primitives unless the control is a highly layout-specific visual element.
