# Consistent record navigation

The user approved implementation on `codex/portal-consistency-and-toast` after the third critique on 2026-10-11. Preserve the existing uncommitted work; execute in this checkout without commits or a new worktree.

## Experience

Substantial records, reviews, comparisons and forms occupy the application content area as independent pages. Keep the sidebar and top header. The first control is the existing labelled Back link, followed by one record/form h1. Do not repeat the list's module heading, tabs, summary metrics or filters on the detail screen. Do not introduce breadcrumbs. Reuse `PageHeader`, `back-link`, portal cards/buttons and the established Inter typography.

Appointment request Review/View share one detail page. Research requests/history use one research detail layout; supervision uses its detail layout. Keep stage separate from waiting age. References and programme information belong in details and remain searchable in lists. Decisions follow API capabilities, never the wording of an entry button. Display actual recorded outcomes and refresh after decisions; retain errors, stale-state protection, documents and audit events.

Return restores the originating list's search, filters, Requests/History selection, page and page size. Lecturer Supervisor list context is URL-based. Existing Supervisor application, research, supervisee, Panel recommendation, assignment, Office record and notification URLs remain supported. A direct record link without an originating list has a labelled return to its owning list.

Previously local editors/details can use a shared content host so their owning list remains mounted but hidden and inaccessible while the detail is visible. A transient browser history entry handles browser Back for these local views; these editors are not new bookmarkable API record endpoints. Reloading a local editor returns to its owning workspace rather than restoring a potentially stale draft. Routed records remain refreshable through their existing authorised loaders. Do not persist record payloads or permissions in browser storage/history.

Large forms ask before discarding changed inputs on Back or route navigation. Prevent leaving during an in-flight mutation. Brief confirmations and previews remain centred modals with keyboard focus containment, Escape/backdrop dismissal when idle, and focus restoration. Permanent adjacent file previews and inline Marks scoring remain contextual controls.

## Migration inventory

1. Shared record-page host/header, return context, transient navigation, unsaved-change guard and accessible modal.
2. Lecturer Supervisor appointment/supporting request details, research/profile routes and supervisee context. Student application tracking and research/new application screens; Office already-routed detail pages use the same header. Coordinator inline review sections remain inline, with no artificial detail conversion.
3. Panel selected-Lecturer/Coordinator review, submitted tracking/history, nomination/replacement form and workload detail. Existing assignment and Office appointment detail pages retain their routes.
4. Student and Staff registry full profiles and substantial create/edit forms.
5. Capacity commands/comparisons, reconciliation review/repair, timeline add/edit/import, document requirement editing and workflow history records.
6. Audit Marks, files, announcements, letters and brief calendar previews. Preserve already appropriate pages/inline editors/print flows. Consolidate brief modal behaviour without changing business rules.

## Architecture

`RecordPageProvider` belongs inside `AppLayout`'s main element. It exposes a sibling content host for local detail/form pages and hides (without unmounting) the originating workspace. `RecordPage` renders `PageHeader` and existing content into that host. It owns transient history navigation, focus/scroll restoration and optional dirty/busy guards. Existing routed pages render `PageHeader` normally. Use a data router for `useBlocker` so browser navigation can protect drafts without custom popstate hacks.

Supervisor primary and supporting details resolve the existing authenticated appointment/team APIs. Add a distinguishable supporting-record route; prevent it being misread as a primary application ID. Research routes must not inherit a list tab bar. Return-context helpers accept only internal known paths in the same owning module and carry originating search state separately from detail-specific profile selection.

No backend schema, dependencies, domain transitions, security boundary, API permissions or source-of-truth academic rules change.

## Verification

Use failing behaviour tests before changes. Cover one h1 and no list navigation on detail, primary/supporting route separation, valid/invalid return targets, all list context, missing/unauthorised record handling and capability rendering. Run affected tests and TypeScript for each migration, then all frontend test scripts, production build/security guards and diff checks. Browser-check populated three-tab lists/details, Back and browser Back, history, deep links/reload, mobile width, keyboard modals and unsaved form cancellation. Do not submit live academic decisions, delete records or publish configuration merely to test presentation.
