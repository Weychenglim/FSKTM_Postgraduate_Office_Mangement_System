# Office Dashboard UX enhancement proposal

Prepared 20 October 2026. Status: **authorised and implemented**. The audit and twelve critique passes below preserve the original design reasoning; implementation verification and practical limits are recorded in PROJECT_STATUS.md and the execution plan.

## 1. Recommendation in plain language

Make Overview the place where Office learns what needs attention. Give the calendar, submission windows, setup tools and reporting their own clear homes. Use the same page structure and typography throughout the permitted Office pages.

Keep the existing Manage Participants button visible on Overview. Keep Participant Lifecycle Management and Acting Coordinator Delegations where they are, with their present UI, routes, services, permissions and records. A temporary relocation would add navigation churn without improving the rest of the Dashboard.

## 2. Audit method and limits

Reviewed the supplied handoff, screenshots, relevant sections of the three governance documents, the Office operating workflow, Registry handoff and manual test guide. Inspected the current working tree rather than assuming the handoff's observations were still current.

Used brainstorming, frontend-design and web-design-guidelines for the review. Consulted the [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md) for accessible navigation, labels, focus, forms, content handling and responsive layout. Existing portal conventions and the user's protected boundaries take precedence over generic styling advice.

Viewed the running local application at `127.0.0.1:3001`, using its existing Office demonstration session. Inspected desktop screenshots and rendered page structure. Checked Overview, Timeline and Reports at a 390 x 844 viewport, then restored normal sizing. Opened empty forms and read-only details; did not submit forms, publish policies, grant access, import workbooks, change deadlines or alter academic records.

This is a UX audit, not a completed functional acceptance run. Empty operational-period/Marks fixtures mean populated period lists, selected-task recovery, import preview results and destructive confirmation outcomes were inspected in source/documentation rather than exercised against live records. Capacity multi-version comparison, historical pagination and cancellation edge cases likewise need dedicated fixtures during implementation. Protected participant/delegation pages received boundary inspection only, not an improvement audit of their inner workflows.

Observed counts below describe this demonstration dataset, not fixed product requirements. Screenshots and rendered measurements were inspected in this chat; no standalone screenshot archive was created.

## 3. What was inspected and what needs to change

| Area | Live inspection | Findings and proposed treatment |
| --- | --- | --- |
| Overview `/dashboard` | Full rendered content, desktop and phone view | Four header shortcuts compete with the semester Manage action and Manage Timeline. Calendar dominates the first screen. Attention is below it; the narrow Action Centre creates a long column beside a short table. Replace duplicate monitoring presentations with one bounded attention section above a compact calendar preview. |
| Calendar `/dashboard/timeline` | Loaded page, empty Add Entry editor, Import Timeline initial step; desktop and phone | Four large summary cards repeat semester metadata. Periods, enforcement, Marks windows and informational-event extensions interrupt the calendar page. Calendar, table and history then repeat content down a very long page. Separate operational management; use one calendar workspace with Calendar/Entries/History views. |
| Operational periods, currently embedded | Loaded empty period states and Create appointment period form | Different purposes are stacked in one card. Ordinary creation uses a modal headed Review decision. Text/date inputs measured 18px high with zero padding; custom selects were much taller. Give this tool a dedicated page and normal form controls, with confirmation reserved for consequential commands. |
| Academic Semesters `/dashboard/semesters` | List, default creation form, existing Active semester details and audit | Create form appears immediately even when Office is browsing an existing semester. Open changes content below the list rather than giving a clear record transition. Archived tab and Include archived are separate controls. Use an explicit list-to-detail flow; expose New semester intentionally. Preserve every lifecycle gate and closure preview. |
| Lecturer Capacity `/dashboard/lecturer-capacity` | Published baseline, six readiness blockers, entries and history | Operational policy and selected history version are not clearly separated. Current policy is derived from selectedPlan. Four similar-looking top actions provide little guidance about the correct next step. Prior-semester copying is supported by services but not visibly offered. History reads only the first 100 records. Separate current authority, draft editing and history. |
| Supervisor workload `/supervisor-appointments/workload` | List and lecturer details | Large summaries and distribution repeat each other. Filters require Apply, unlike Panel's immediate filtering. Summary says seven Full Load, while six rows say Not configured. Rows show zero limits for missing policy. Unify presentation around authoritative capacity states and make missing configuration distinct from a valid zero limit. |
| Panel workload `/panel-appointments/workload` | List and lecturer details | More coherent than Supervisor: labelled filters, matching counts, page sizes and active/reserved separation. Retain these strengths and align the other monitor with them. Keep this existing tool in its existing module. |
| Reconciliation `/dashboard/workflow-reconciliation` | Five-issue list and capacity issue preview | Long blocker paragraphs dominate rows. Preview exposes Semesterid, Capacityplanid and Readinesserrors as labels, repeats the same errors and ends at a generic review-required explanation. Present problem, effect, safe next step and expandable facts. Keep repair eligibility and fingerprint checks unchanged. |
| Reports `/dashboard/reports` | Populated report, filters, attention and breakdowns; desktop and phone | Capacity items render Overdue - No date. Fourteen attention rows precede the breakdowns; all Office breakdowns expand into another long page. No dedicated faculty capacity block despite backend support. Keep the recently improved filter footer, add correct type-specific status wording and use report sections with bounded records. |
| Dossier `/dashboard/progress/:studentId` | Opened through Reports; Overview, Supervisor, Panel, Marks and Timeline tabs | Student header, lifecycle block and repeated status cards delay the actual section. Histories are expanded. Reports-origin link arrived with Back to Dashboard. Elapsed calendar entries show Completed, unlike Timeline's Ended. Improve permitted record sections and return context; preserve participant lifecycle presentation and shortcut. |
| Protected participant route | Loaded list and delegation region, no actions executed | Acting Coordinator Delegations is part of Participant Lifecycle Management. Do not split, relocate or restyle it. Preserve existing entry points from Overview, semesters, Registry and dossiers. |

### Important source evidence

- `frontend/src/components/AdministrationDashboard.tsx`: coupled `Promise.all` for summary/workload, duplicated attention structure, generic Panel navigation and a one-second navigation delay.
- `frontend/src/components/MonitoringTasksCard.tsx`: shared renderer maps every returned task with no preview bound or grouping.
- `backend/dashboard/actions.py`: task feed is limited to **20** records. It also adds a completed timeline-upload task. A returned task count is not necessarily a faculty-wide total.
- `frontend/src/components/OperationalPeriodManagement.tsx`: normal form inputs lack a size class; creation is hosted in DecisionDialog. Existing operation, extension, linkage and audit services must remain authoritative.
- `frontend/src/components/TimelineManagement.tsx`: embeds OperationalPeriodManagement and links calendar rows to in-page operational/Marks anchors.
- `frontend/src/App.tsx`: Marks configuration/task-assignment callbacks currently lead to Timeline Management. These must be included when changing the deadline destination.
- `frontend/src/components/LecturerCapacityManagement.tsx`: selectedPlan supplies Current policy; plan/window/audit reads use `limit: 100` without offset traversal; visible cancellation is tied to current/upcoming restrictions.
- `frontend/src/components/WorkflowReports.tsx`: attention renderer has waiting, participant and reconciliation branches, then treats everything else as overdue. Capacity needs its own branch.
- `frontend/src/components/SupervisorWorkloadMonitoring.tsx`: summary uses legacy availability labels; row badges prefer capacityState. This explains the contradictory display.
- `backend/dashboard/dossiers.py`: calendar status returns COMPLETED purely when the end date has passed. Any wording correction must be specific to calendar display, not a global reinterpretation of completed appointments or evaluations.
- `frontend/src/components/StudentProgressDossier.tsx` and `frontend/src/App.tsx`: Reports invokes generic navigation, while the source-aware openDossier helper is used elsewhere. Reports needs the same return-context contract.

### Responsive evidence

At the checked phone viewport, Overview's attention heading began around 1,183px down the document, with Action Centre around 1,813px. Timeline's master schedule began around 2,371px, and its entries around 3,026px. Reports' first attention heading began around 1,194px and its final breakdown around 4,867px. Exact positions depend on data and viewport, but the reading-order problem is clear.

## 4. Shared components: yes, but no common composition

The module already uses shared components. Rebuilding a second general design system would waste existing work.

| Existing building block | Current use | Recommendation |
| --- | --- | --- |
| PageHeader, PortalButton, PortalToast | Most management pages | Continue using them; standardise permitted caller composition and scoped presentation. |
| PortalCard and StatusBadge | Semesters, periods, reports, dossiers and other pages | Use consistent surfaces and semantic status labels; remove decorative or duplicate summaries. |
| PortalSelect and form-control classes | Timeline, periods, semesters, capacity, workload and reconciliation | Use explicit labels and a consistent control size; inputs must not rely on the unpadded base class. |
| StateViews | Loading, error, empty states | Keep loading, confirmed empty, failed and stale states distinct. |
| RecordPage and RightDrawer | Timeline editors/imports, capacity editors, monitoring/detail pages | Reuse the guarded record flow. Choose the visible surface by task size rather than a file's historical Drawer name. |
| DecisionDialog and ClosureReview | Consequential commands and semester closure/handover | Retain audited confirmation semantics. An ordinary draft form should not be labelled Review decision. |
| CoordinatorDataTable, WorkspacePagination, ListState, request-detail primitives | Especially Panel monitoring and newer appointment work | Reuse stable patterns without changing shared defaults or altering other consumers. |

The main font is already **Inter**. Inconsistency mostly comes from size, weight, casing, line height, local styling and inconsistent density. Portal defaults use very small, heavy uppercase buttons/labels; newer appointment detail typography uses 12px normal body text, 12px semibold labels and 16px semibold section headings. Some pages mix both systems and duplicate raw table/card markup.

Proposed permitted-Office typography: retain Inter; page headings 24-30px with a consistent weight, section headings 16px/600, names 14px/600, body 12-14px/400, labels 12px/600 and readable secondary text. Use 10px only for genuinely secondary compact metadata. Use sentence case for ordinary actions and labels, consistent line heights and tabular numerals for comparisons. Validate sizes in screenshots before treating the exact scale as settled.

Apply this within new, opt-in Office Dashboard presentation boundaries. Do not change global `index.css` rules, PortalPrimitives defaults, DecisionDialog defaults, PortalSelect defaults, shared typography constants, the portal shell or the Office sidebar. Protected components must never be descendants of a new styling boundary. Shared read-only dossier/report changes must be restricted to the Office branch unless explicitly approved for other roles.

## 5. Approaches considered

1. **Recommended: consistent Dashboard navigation and separate workspaces.** Keep existing destinations, give deadlines their own route and improve the allowed pages incrementally. Solves discoverability and ownership without rebuilding academic services.
2. **Visual cleanup only.** Change spacing and font classes while retaining the current hierarchy. Lower effort, but Office still has to discover submission controls inside a calendar page and scan repeated warnings.
3. **A single guided setup wizard.** Good for a first semester but poor for daily monitoring, carryover work, historical review and independent maintenance. It would imply one linear lifecycle for tools with different authorities. A short contextual next-step hint is preferable.

## 6. Proposed navigation

Use the existing Office sidebar unchanged. Inside the permitted Dashboard pages provide a stable local navigation row:

**Overview | Calendar | Periods & deadlines | Reports | Administration**

Administration opens a clearly labelled grouped menu:

- Semester setup: Academic semesters; Lecturer capacity.
- Monitoring: Supervisor workload; Panel workload.
- Data checks: Workflow reconciliation.

Workload links still open their existing module routes. Preserve the existing Supervisor/Panel sidebar highlight and back behavior when entering from those modules. Add Dashboard-origin return context for links entered from Dashboard; do not move workload tools or replace their original navigation. Provide contextual workload links in the Overview monitoring section so daily work does not depend solely on finding the menu.

On small screens, use an accessible page chooser with the current page visible, rather than an overflowing row of tiny tabs. The Administration menu needs group labels, keyboard operation, Escape dismissal and focus return.

Existing routes remain valid. Proposed new Office-only route: `/dashboard/periods`. Add it to route constants, known-path validation and lazy Office routing. Do not modify the protected route, its permission branch or its child composition. Preserve all existing destinations through navigation, including protected shortcuts on other screens.

## 7. Proposed page behavior

### Overview: the daily starting point

Order the content as follows:

1. Heading and existing Manage Participants shortcut.
2. Local navigation and compact, fully readable active-semester context.
3. Needs attention: one full-width, bounded list of at most five issue groups.
4. Routine monitoring: concise pending-request, evaluation and workload summaries, with clear owning destinations.
5. Compact calendar preview, preserving Research Project 1/2 selection and access to the complete calendar.

Replace the Office presentation of the duplicate attention table and unlimited feed with this single hierarchy. Do not edit the shared feed renderer in a way that alters Student, Lecturer or Coordinator dashboards. No sticky alert bar, decorative statistics wall or fixed-height inner scrolling column.

Group related capacity records by semester, role and state, with expandable lecturer details and Review capacity. Keep exact records reachable. A lecturer can occupy two role entries; label role-entry counts and distinct lecturer counts separately. Do not merge a reconciliation issue into a capacity group merely because its text looks similar, or add their counts into one number. Show server-classified blocking issues and actual overdue evaluations prominently; waiting with another reviewer is monitoring, not an Office approval task or an invented overdue state.

Completed setup items leave Needs attention but remain visible in the relevant setup/history context. Quietly show healthy/zero states without filling the queue with zero-count actions. Clicking a record should navigate immediately with the correct filters/identity, without a toast-induced delay. The Panel workload action must open workload monitoring directly.

The feed is capped at 20. Initially describe it as a preview and use authoritative summary/module counts where available. Each group leads to its complete owning list. Do not promise View all actions, exact totals or complete prioritisation using only the capped response. A new cross-module paginated queue would require an explicitly scoped read-service enhancement; it is not necessary for this proposal's first implementation.

### Calendar: dates and communication

Keep `/dashboard/timeline` as the calendar destination, with a Calendar presentation label. Place the selected semester and its status in one context band. Remove repeated semester metric cards. Use Calendar, Entries and History views rather than stacking three complete representations. Add event is the primary calendar command; import/template actions belong together in an Import menu or flow.

Keep title, P1/P2, audience, descriptions, accurate day-based bars, details and import safeguards. Explain linked events with an owner label and Manage period link. An informational event may change its calendar dates with an audited reason where required; this does not grant submission permission. Its standalone date-extension command stays with the event's calendar detail rather than populating the operational-period list with every informational event.

Import continues Preview -> required warning acknowledgement -> Confirm import. Confirmation still replaces only the selected semester's current calendar. No silent publication, enforcement, linkage or deadline changes.

### Periods & deadlines: submission access and extra time

Create a standalone workspace with an explicit semester selector. Organise activities into Supervisor applications, Panel recommendations and Marks evaluations. Show a concise period list, then open one period for scope, opening/deadline, lifecycle, applicable rules and history.

For appointment activities show **Date rules on/off** separately from **Draft/Published/Closed**. Preserve Create draft, Publish and Enable enforcement as separate actions; publication must not silently enable enforcement. Offer one clearly contextual next step when prerequisites are known, while keeping all permitted actions discoverable.

An extension asks who receives it: Everyone in this period's scope, or Selected cases/tasks. Show semester, programme, student/participant or task/evaluator identity, existing deadline, proposed Malaysia deadline and reason. Before confirmation state whether the linked calendar changes or stays unchanged. Closed-semester Marks recovery permits only eligible selected-task completion windows. Submitted evaluations remain closed.

Marks still owns rubric, evaluator targeting, period creation/publication and assignment. Provide an exact link to Marks configuration rather than duplicating those controls. Fetch the matching calendar entries independently for explicit linking; the new page must not depend on Timeline Management being mounted. Refresh authoritative period/calendar reads after a successful change and distinguish mutation success from a failed refresh.

Update all existing Marks deadline entry points, Timeline Manage period anchors, task routing and record links to the new destination. Old Timeline fragment links should continue to resolve the intended period through a compatibility redirect. Preserve selected semester and period identity in the new destination. Do not weaken eligibility, stale-state checks or audit reasons.

### Academic semesters: browse first, edit intentionally

Show current semester context and the semester list. New semester opens a focused draft form; Open enters an identifiable detail page with Overview and History. Active/Closed configuration is presented as read-only facts rather than a disabled editing form. Keep permitted lifecycle commands together in a distinct actions area.

Activation readiness explains missing published capacity with a direct capacity link. Retain the real unfinished-evaluation preview, acknowledgements, reasons and atomic handover. Clearly explain that extending the semester does not extend submission deadlines. Provide coherent archived filtering, preserving access to all existing historical records. Do not modify the existing Manage participants shortcut.

### Lecturer capacity: distinguish authority from a draft

Show Published operational policy separately from the version being viewed. A Draft or Superseded version must never be labelled Current policy. Explain missing entries in terms of lecturers and roles, then guide Office to Create draft, Copy eligible previous semester or Revise published version as applicable. Copy obeys the backend's strict latest-prior-published-source rule; never create a new automatic copy policy.

Use clear sections for Limits, Availability and Version/audit history. Keep comparison and immutable versions. Explain capacity as the configured limit and workload as current global occupation; show primary/supporting and active/reserved distinctions correctly. Missing policy is Not configured, not a fabricated zero limit. A configured zero remains a valid zero.

Add bounded history navigation using existing pagination contracts so records beyond 100 can be reached. Keep historically valid restriction cancellation accessible according to returned permissions without editing the original history. Published plans remain immutable; reducing limits preserves appointments and may produce Over capacity. Drawers/forms must retain draft input on stale conflicts and require a fresh authoritative read before retry.

### Workload monitoring: the same reading pattern for both roles

Retain two existing tools, each with lecturer filters, matching counts, table, 10/25/50 pagination, details and all-filtered-results export. Align Supervisor with Panel's simpler layout. Use immediate local filtering consistently for these already-loaded lists; Reports retains explicit Apply because it fetches a report and controls export scope. Name that distinction visibly.

Summaries and rows must use the same authoritative capacity state. Remove contradictory legacy Full Load aggregation. Show which counts cover all lecturers versus filtered matches. Details identify current effective semester and Published policy while explaining that occupied workload spans semesters. Supervisor counts active primary/supporting appointments; pending Supervisor requests do not reserve capacity. Panel counts active appointments plus reservations, without double counting final approval. Do not make a historical Dashboard semester selector pretend to change the current workload resolver.

### Reconciliation: understand before acting

Retain the familiar technical name with a plain subtitle such as Check inconsistent records. Shorten issue rows to the problem, affected identity and classifications. Open one issue to show: what is wrong, what it affects, where to review it, and whether a verified repair exists. Map known state keys to human labels and move raw technical details under a disclosure.

Provide an owning-tool link where a safe known destination exists; review-required must not become a dead end. Keep mandatory reason, individual confirmation, final confirmation, fresh preview/fingerprint, role restrictions and immutable repair audits. Never show Apply where the backend disallows a repair. Do not introduce bulk repair.

### Reports and dossiers: answer a question without another wall of cards

Preserve the recently improved Reports filter toolbar/footer, applied-filter summary, pending-change notice and XLSX scope. Standardise the page name as Workflow reports with Analytics as a section if useful. Present summary first, then navigable sections for attention, appointment workflows, evaluations, calendar and Office capacity. Keep existing participant reporting values and links intact.

Capacity attention gets capacity-specific states; only actual deadline metadata can produce Overdue. Render the backend-supported Office capacity summary with its real scope clearly labelled. Paginate or progressively disclose long report attention lists. Keep current-state reporting semantics and informational waiting ages; do not invent trends, historical snapshots or SLA thresholds. Export uses the applied filters and the established authorised service.

Dossiers retain a clear student identity and current state, then the existing section tabs. Make record histories expandable and use specific Open Supervisor/Panel/evaluation record labels. Preserve complete access to audit events. Keep participant lifecycle components and Manage Participant links unchanged. Fix the Office Reports-to-dossier return path, including applied filters and list position. Calendar entries whose date has passed should display Ended in the permitted Office calendar section, not imply a student completed work. Use a calendar-specific display mapping so genuine completed appointments/evaluations remain Completed. Other roles' redaction and layouts stay unchanged.

## 8. Twelve critical review passes and revisions

These are twelve self-critique passes, not independent agent reviews. Each challenges an earlier version of the proposal; the recommendation above incorporates the revisions.

| Pass | Critical challenge | Revision retained in the proposal |
| --- | --- | --- |
| 1: First useful action | A cleaner header is cosmetic if staff still scroll past a giant calendar to find a blocker. | Put a bounded attention section before the calendar, with a concrete next action and visible semester context. |
| 2: Navigation overload | Turning every existing button into a tab merely creates a horizontal button farm. | Four direct page destinations plus one grouped Administration menu; small-screen page chooser. No second sidebar. |
| 3: Hidden daily work | An Administration menu can become a dumping ground and bury workload monitoring. | Label setup/monitoring/data-check groups and retain direct contextual workload links from Overview and existing modules. |
| 4: Cosmetic queue trimming | Showing five raw tasks just hides the other ten and leaves twelve capacity warnings conceptually duplicated. | Group typed capacity issues, preserve drilldowns and owning lists, remove completed items from attention, and avoid an inner scrollbar. |
| 5: False totals | A beautiful group badge can lie: the server only returns twenty tasks, role counts overlap and capacity/reconciliation can describe related facts. | Treat the feed as a preview, label counting units and use authoritative owning summaries. No cross-category sum or invented comprehensive View all. |
| 6: False urgency | Red badges and oldest-first ordering can imply overdue approvals or an Office decision the user cannot make. | Separate actual deadline failures and server-classified blockers from ordinary waits. Name the responsible actor; no new SLA. |
| 7: Orphaned deadline controls | Moving the periods card breaks Marks buttons, calendar anchors and direct links even if the new page looks excellent. | Add a route/link migration inventory, preserve period/semester context, and retain old fragment compatibility. Keep independent calendar reads. |
| 8: Dangerous simplification | One Publish and enable button, one generic extension, or a semester-wide deadline shortcut would erase important safeguards. | Keep publication/enforcement separate; show everyone versus selected scope and calendar consequences; preserve closed-semester recovery limits. |
| 9: Global style collateral | Changing shared font/button defaults is a fast way to violate the protected-area constraint and disturb other roles. | Use opt-in wrappers/caller styling only for permitted Office views; freeze shared defaults and keep protected subtrees outside new boundaries. |
| 10: Context ambiguity | A universal semester dropdown would falsely suggest historical selections control global current workload or all dossier history. | Each tool states its own scope: selected management semester, effective workload policy, applied report filters or complete student history. Preserve source-aware Back. |
| 11: Uniformity at the wrong level | Forcing every task into a modal, applying every filter immediately, or hiding all history confuses a consistent appearance with identical behavior. | Share hierarchy and field sizing; use full forms for complex editing, confirmations for consequences, explicit Apply for Reports and retained expandable/paged histories. |
| 12: Honest failure and proof | A tidy happy-path mockup can show no active semester during loading, hide warnings behind truncation, lose drafts on a stale response or silently alter protected UI. | Separate loading/error/empty/stale states, keep long details reachable, isolate independent reads, test semantic contradictions and require protected-route visual/behavior baselines. |

## 9. Suggested implementation sequence after design agreement

1. **Baseline and scope:** inventory changed files and current concurrent work, capture protected desktop/phone baselines, define permitted styling boundaries and navigation contracts. Maintain the three governance documents throughout implementation.
2. **Overview and navigation:** introduce local navigation in permitted pages; replace Office-only duplicate monitoring presentation with grouped attention; fix immediate navigation and independent loading/error/retry states. Keep a compact calendar preview and existing protected links.
3. **Separate periods from calendar:** create the Office periods route, move only operational presentation/orchestration, update all entry points and compatibility links, and simplify calendar views. Reuse services and enforce all existing guards.
4. **Standardise management tools:** explicit semester detail flow, capacity authority/draft/history separation, consistent permitted controls and aligned workload presentation.
5. **Reports, reconciliation and dossiers:** correct misleading states/labels, structure long details, add scoped capacity reporting, preserve Office return context and progressively disclose permitted histories.
6. **Focused acceptance:** verify navigation, responsive hierarchy, real status semantics and unchanged protected areas. Broaden backend checks only for actual data/service changes and affected contracts.

No database migration, dependency upgrade, lifecycle-rule rewrite, new notification behavior or scheduled delivery activation is needed for the proposed presentation/navigation work. If implementation uncovers a necessary read-contract enhancement, scope it explicitly before expanding this plan.

## 10. Acceptance criteria

- Office can identify current semester, a real blocker and the appropriate owning page from the initial Overview content; calendar does not precede attention on narrow screens.
- Overview shows at most five attention groups and keeps all underlying records reachable. No completed task remains in Needs attention, false total, role-count ambiguity or duplicate sum.
- Periods & deadlines is directly accessible outside Calendar. Existing Marks links and old period anchors land on the correct semester/period. Linked events still follow authoritative period changes.
- Every affected page uses the chosen Office typography, labelled controls, predictable page/form/detail hierarchy, visible focus and meaningful links. No 18px unpadded editing fields.
- Reports capacity is never labelled overdue without a deadline. Supervisor summary matches row capacity states. Missing policy remains distinct from zero; calendar expiry does not claim completion.
- Draft/Published/Superseded capacity is clear; history beyond 100 remains reachable; source-copy and cancellation follow existing permissions. Existing appointments and submitted results are preserved.
- Filters and source return context survive supported record drilldowns; report exports use applied filters and workload exports include all matching pages.
- Empty, failed, slow and stale reads have distinct states and Retry. Independent Dashboard request failures do not leave unrelated counters loading indefinitely or show false no-active-semester messages.
- Review desktop, tablet, 390px and 320px layouts, 200% zoom, keyboard focus/menus/forms, long lecturer/student/programme names, long error lists, zero data and large queues. Page controls must remain reachable without whole-page horizontal overflow; wide data regions may scroll within labelled containers.
- Protected participant/delegation source, route branch, APIs, data and permission behavior are unchanged. Existing entry links work. Compare protected screenshots, typography and interactions against the baseline, including shared-component consumers.
- Recheck other role dashboards/reports/dossiers whenever consuming shared primitives or data. Do not expose Office capacity management, internal reasons or staff-only history to other roles.

No application changes or acceptance-test pass is claimed by this proposal.
