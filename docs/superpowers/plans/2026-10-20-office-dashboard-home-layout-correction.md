# Office Dashboard home layout correction plan

> User approved the plan, reviewed the concrete preview and subsequently authorised implementation with “implement it”. The home correction is implemented and verified below. Preserve existing concurrent work; no commits or resets. Native 200% browser zoom remains unverified because the available browser controls do not expose it.

**Goal:** Retain the graphical semester timeline on Dashboard home, with a concise attention summary beside it when space permits and visible tool links below.

**Architecture:** Keep the existing application sidebar and routes. Remove the rejected Office Dashboard navigation strip and Administration dropdown; retain the scoped presentation boundary and RecordPageProvider. Compose existing independent reads, timeline preview and tool navigation within Office Overview. Preserve linked-tool improvements and source-aware returns.

**Tech stack:** Existing React, TypeScript, portal primitives, TimelineCalendar and scoped officeDashboard.css. No dependencies, APIs or business-rule changes.

**Design basis:** The user's latest drawing discussion and supplied Semester Timeline screenshot supersede the earlier proposal's Dashboard navigation and small agenda-only treatment. Timeline remains on home. Research references are recorded at the end.

## Fixed boundaries

- Preserve Manage Participants/lifecycle management and Acting Coordinator Delegations, including their UI, placement, routes, permissions, APIs, data and existing links.
- Preserve the application sidebar, shared default styles/primitives, other roles and unrelated concurrent work.
- Keep operational periods/extensions on their existing separate route, outside Calendar.
- No top-level Dashboard tabs, equivalent mobile page-switch dropdown or hidden Administration menu.
- Retain Research Project 1/2 selection inside the timeline: it changes the phase displayed rather than navigating between tools.
- Keep exact routes, selected semester/period deep links, guarded forms and source-aware return contexts. No live academic writes for visual verification.

## Five critique passes and resulting decisions

### 1. A 70/30 ratio is not a responsive layout

The existing sidebar and page padding consume substantial width. A percentage split can leave both the calendar and attention labels unreadable on ordinary laptops or at increased zoom.

**Decision:** Use a flexible timeline column and a roughly 300–320px attention column only when both fit. Start visual evaluation at 1040px of actual content width, not viewport width. Adjust from screenshot measurements. Otherwise stack attention, timeline and tools. Never reduce text size to preserve two columns. Avoid whole-page horizontal scrolling.

### 2. The calendar can still bury every tool

Retaining the large preview, adding a separate semester card and stacking oversized tool cards would recreate the original long page.

**Decision:** Put current semester/status in the page header area. Retain the existing maximum-three-event preview per phase and View full calendar link, with honest shown/total wording. Keep normal row and card padding, consolidate repeated explanatory copy and use independent panel heights. No fixed-height clipping or nested scroll area. Tools follow immediately after the calendar/attention row.

### 3. The side panel can become the old Action Centre in miniature

Putting 15 warnings in a narrow box merely produces more wrapping. Configuration gaps, overdue work and another role's pending decision are different kinds of information. Combining Supervisor and Panel warnings can also imply a false number of distinct lecturers.

**Decision:** Use compact rows grouped by responsible workspace/action, never a per-person feed. Display real deadlines first when present. Separate Office review from Waiting on others. Keep Supervisor/Panel role counts distinct and label capped-feed counts as preview counts. Use neutral styling for ordinary waiting; do not invent urgency, SLA thresholds or unique-person totals. Each row links to the owning workspace; its detailed list remains there. Present every returned category or a visible link naming additional categories: never silently discard categories to meet a decorative row cap.

### 4. The tool directory can look like a forgotten footer

Bare links beneath a dominant calendar are not automatically discoverable. Large identical cards would create a different form of clutter. Repeating all existing appointment and Marks modules here would add another competing navigation system.

**Decision:** Use a clearly headed Office tools section with three visible groups. Each tool has a descriptive text link, a short purpose line and a generous clickable area. Show eight existing destinations: Academic semesters, Academic calendar, Periods and extensions; Lecturer capacity, Supervisor workload, Panel workload; Workflow reports, Reconciliation. Student dossiers remain reached through reports/records. Do not add a redundant dossier destination without a real browse page. Do not imply that cross-semester workload totals are restricted by the displayed active semester.

### 5. A cleaner home does not fix confusing destinations

Removing the strip without checking child pages can strand users. Replacing every return link with Back to Dashboard would break Reports → dossier and other existing source contexts. Rebuilding all tools at once would repeat the previous oversized redesign.

**Decision:** Correct home/navigation first. Preserve the existing child-page refinements. Verify a shared page contract: accurate breadcrumb/return, one title, visible relevant semester, one main action where appropriate, grouped filters, list/results, explicit record/form and secondary history. Check all permitted tools against this contract; record and fix only concrete inconsistencies in a subsequent focused task. Do not add tabs as a default solution to every page.

## Implemented home composition

1. Header: Dashboard title, active semester/status and existing Manage Participants shortcut in its current header position.
2. Main row: graphical Semester Timeline on the left; compact Needs attention on the right when width permits.
3. Office tools: three groups of existing links, always visible without opening a menu.
4. Remove the separate duplicate routine-monitoring card from the proposed home; carry useful counts into relevant attention/tool summaries only where their source and unit are accurate. Existing destination tools retain their monitoring data and actions.

## Execution tasks

### Task 1: Validate the drawing with real layout proportions

**Deliverable:** A reversible visual preview of home, using the actual portal sidebar/header proportions and fictional data. It must show the timeline and attention content, not empty placeholder boxes. Keep production code unchanged for this task.

- [x] Preview at 1440px and 1280px with sidebar open; at 1024px, 390px and 320px. Also exercise 200% CSS page scaling as a stress case; this is not native browser zoom.
- [ ] Verify native 200% browser zoom. Available in-app browser controls did not expose native zoom; this remains an explicit verification limit. CSS scaling does not replace it.
- [x] Include normal, long-label, no-attention, loading and independent-error examples; show both Research Project phases.
- [x] Check minimum timeline/attention widths, page length and tool discoverability. Keep attention before calendar in DOM/stacked order; visual two-column placement begins at 1040px of available content.
- [x] Present the preview for design review before implementing the correction. Interactive preview and desktop screenshot supplied; user subsequently authorised implementation.

### Task 2: Correct home and remove the rejected navigation

**Files:** frontend/src/components/AdministrationDashboard.tsx, OfficeCalendarPreview.tsx, OfficeDashboardLayout.tsx, OfficeSemesterContext.tsx (opt-in compact presentation), officeDashboard.css and utils/officeDashboard.ts for grouping/link generation. Existing PortalButton, PortalCard, useOfficeRead and TimelineCalendar remain the building blocks.

**Interfaces retained:** AdministrationDashboard navigation callbacks, OfficeCalendarPreview({onOpen:()=>void}), isOfficeDashboardPresentation(pathname,role), OfficeDashboardLayout({enabled,children}) and existing API response types. Do not change services to satisfy a visual count.

- [x] Add regression cases for task grouping units, complete category discoverability and exact owning-tool destinations where grouping changes.
- [x] Remove the strip, dropdown and their mobile counterpart while keeping the scoped wrapper, nested record host and protected exclusions.
- [x] Compose home as described above with content-width-based responsive layout and independent panel heights.
- [x] Place the eight destinations in the tool directory. Preserve Dashboard-origin workload navigation state and Marks semester/period links.
- [x] Update existing assertions that require attention before timeline in document order only where needed: stacked/keyboard order remains attention first, with CSS placing timeline left on wide screens.

### Task 3: Verify tool-page structure and return paths

**Files inspected:** AcademicSemesterManagement.tsx, TimelineManagement.tsx, OfficePeriodsManagement.tsx, LecturerCapacityManagement.tsx, SupervisorWorkloadMonitoring.tsx, PanelWorkloadMonitoring.tsx, WorkflowReports.tsx, WorkflowReconciliationCentre.tsx, StudentProgressDossier.tsx and App.tsx navigation wiring.

- [x] Walk Dashboard → all eight tools → Dashboard live; semester detail live and relevant guarded record/form paths in mounted checks. No live submissions.
- [x] Verify Reports → dossier → Reports live, remembered report state in mounted checks, and both Dashboard-origin workload return paths live.
- [x] Verify Calendar period links and Marks deadline links retain the owning semester and activity in existing mounted regressions and source wiring.
- [x] Check page contract from critique 5. Existing destination refinements remain intact; no additional child-page source edits were needed for this correction.
- [x] Confirm protected routes receive no replacement navigation, layout or typography changes using route exclusions, mounted computed-style checks and frozen-source hashes.

### Task 4: Regression, visual acceptance and documentation

**Relevant existing tests:** frontend/src/components/OfficeDashboardUx.test.tsx, DashboardActionCentre.test.ts, OfficePeriodsManagement.test.tsx, GlobalRecordNavigation.test.tsx; frontend/src/utils/officeDashboard.test.ts; frontend/tests/officeDashboard.browser.test.mjs and managementDashboard.browser.test.mjs.

- [x] Update mounted home cases for wide/stacked composition, independent failures, all tool links, empty state and protected exclusions using real portal CSS. Both phases and long-label cases were exercised in the preview; both phases also checked live after integration.
- [x] Run relevant unit tests, mounted browser checks, `npm.cmd run lint` and `npm.cmd run build` from frontend: 268 unit tests, 44 Office mounted scenarios and five management scenarios pass; TypeScript/build pass.
- [x] Review desktop/narrow screenshots and no-overflow assertions at 1440px/1280px/390px/320px; preview also covered 1024px. No whole-page overflow, internal attention scrollbar or nested Dashboard navigation. Native zoom is the explicit limit above.
- [x] Compare protected/shared-default hashes against a fresh pre-change baseline; all 12 frozen files match. Preserve preexisting concurrent changes.
- [x] Update PROJECT_REQUIREMENTS.md, ARCHITECTURE_AND_CODING_DESIGN.md and PROJECT_STATUS.md with actual implementation/verification evidence. Keep prior rejected proposal as historical context. Changes remain uncommitted.

## Acceptance criteria

- The supplied graphical timeline remains visible on home; P1/P2 and full-calendar access work.
- Attention is compact and interpretable, with honest count units and no silent missing categories.
- The layout fits the available content area and remains usable with sidebar open, narrow screens, keyboard and zoom.
- Office can find all eight permitted tool destinations without a hidden menu or Dashboard tab strip.
- Tool-page context, guards and source returns remain intact.
- Protected lifecycle/delegation areas and shared defaults remain unchanged.
- Visual approval is required separately from passing technical checks.

## Research references

- Shopify Home, task-type summaries: https://help.shopify.com/en/manual/shopify-admin/shopify-home
- Cloudscape, overview versus detailed work and restrained dashboard interaction: https://cloudscape.design/patterns/general/service-dashboard/static-dashboard/
- GOV.UK, clearly named grouped tasks and statuses (use its readability principles, not its transaction-completion workflow): https://design-system.service.gov.uk/patterns/complete-multiple-tasks/
- Linear, compact grouped work rows (not its tab navigation): https://linear.app/docs/my-issues

**Original planning verification:** Checked then-current OfficeCalendarPreview, OfficeDashboardLayout, scoped CSS and project status. No application files or tests were changed during that planning step; implementation evidence follows.

## Task 1 preview evidence

Preview uses the actual unchanged AppLayout, Sidebar, TopHeader, TimelineCalendar and portal primitives, with fictional local data. New files are confined to frontend/tests/officeDashboardHomePreview.{fixture.tsx,css,server.mjs,browser.test.mjs}. The server binds only to 127.0.0.1:3318 and has no backend proxy. Eight tool links open clearly labelled destination stubs and return to home; they do not exercise real destination workflows. Manage Participants remains an unchanged styled shortcut with a preview notice rather than opening a protected workflow.

54 preview assertions passed: nine cases at five viewport widths plus the 200% CSS-scaling stress case. Both phases/event details, eight destinations/return, long names, empty/loading, independent failures/retries, no whole-page overflow and no inner attention scrolling were covered. Screenshots inspected; saved desktop/mobile views are output/mockups/office-dashboard-home-preview-{desktop,mobile}.png. At narrow widths the unchanged TimelineCalendar retains its internal horizontal scroll. These are fictional preview results; implemented application evidence is recorded below.

Run preview: from frontend, `node tests/officeDashboardHomePreview.server.mjs`; open http://127.0.0.1:3318/office-dashboard-home-preview. Run preview assertions while server is active: `node --test tests/officeDashboardHomePreview.browser.test.mjs`.

## Production integration evidence

Implemented at http://127.0.0.1:3001/dashboard. Fresh baseline: system Temp/fkstm-home-layout-implementation-20261020-125137. App routing, global CSS, shell, sidebar, header, portal primitives/select/dialog, TimelineCalendar and three protected lifecycle/delegation files all match baseline SHA256 hashes. Work stayed in the existing checkout because the established UI depends on preexisting concurrent changes; tightly coupled home/layout/grouping integration was performed manually. No reset, stash, commit, push or live academic write.

Independent review identified merged urgency loss, missing monitoring scope and wording that could imply an entire group was overdue. Fixed all three, added deadline-subset/merge regressions, and received no remaining source-review findings. Counts preserve backend-preview scope and distinct Supervisor/Panel entries.

Final frontend commands: full `.test.ts/.test.tsx` discovery through `node --import tsx --test --test-concurrency=3`, `node --test tests/officeDashboard.browser.test.mjs tests/managementDashboard.browser.test.mjs`, `npm.cmd run lint`, `npm.cmd run build`. Results: 268 unit tests pass, 49 mounted scenarios pass, TypeScript/build pass. Only the existing ExcelJS bundle-size advisory remains. Unit log: system Temp/fkstm-home-correction-unit-tests.log. Production screenshot: output/mockups/office-dashboard-home-implemented.png; mounted screenshots: system Temp/office-dashboard-{1440,1280,390,320}.png. Native browser zoom remains unverified; fixtures use mocked APIs, supplemented by read-only live navigation checks.
