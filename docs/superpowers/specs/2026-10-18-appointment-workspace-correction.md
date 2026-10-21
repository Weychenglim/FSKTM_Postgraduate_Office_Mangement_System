# Appointment workspace correction: audit and proposed design

Date: 2026-10-18 (Asia/Kuala_Lumpur)
Status: Implemented and verified; final evidence is recorded in the completed implementation plan and PROJECT_STATUS.md.

## Scope and constraints

The user requested another inspection of Supervisor and Panel appointment workspaces, three critiques, and an implementation plan. Inspect all Student, Lecturer, Programme Coordinator and Office roles. Correct the recent lecturer Panel divergence while retaining the useful supervisee roster and appointed-member identity improvements. Consistency means clear, concise language and predictable interaction patterns; it does not mean identical names or identical permissions for every role.

- Preserve existing tab names and purpose-specific role scope.
- Preserve authentication, programme scope, decision authority, document rules, capacity checks and appointment lifecycle transitions.
- Preserve pending Panel identity privacy on the Student page.
- Do not change the Supervisor Section A application work.
- Do not introduce dependencies, database migrations, new approval stages or a global navigation rewrite.
- Do not commit, push, reset the dirty checkout, or modify academic records as part of this plan.
- Shared presentation changes must be enumerated and checked against every consumer.

## Current role matrix

| Module | Student | Lecturer | Programme Coordinator | Office |
|---|---|---|---|---|
| Supervisor | My supervisors / Applications / Research changes | Appointment requests / My supervisees / Research changes | Appointment requests / Supervisory teams / Programme transfers | Needs attention / Appointment requests / Supervisory teams |
| Panel | Single My panel overview; no staff review workspace | Appointment requests / My supervisees / My Panel students | Appointment requests / Panel appointments | Needs attention / Appointment requests / Panel appointments |

Role-specific destinations are intentional. Office monitors and administers; Coordinator decides within assigned scope; Lecturer reviews incoming nominations and separately nominates for supervisees; Student views their own records and permitted application actions.

## Confirmed findings

1. **Incoming Panel review history is misclassified.** `review_queue_view` returns nominations addressed to the lecturer still at SUBMITTED_TO_PANEL. `review_history_view` returns records with a recorded Panel decision plus cancellations. `LecturerPanelAppointments` merges these, then `PanelBrowse.filterPanelBrowse` uses whole-workflow pending status. An accepted PENDING_COORDINATOR request appears in Requests and is excluded from History. Direct execution reproduced requests=1/history=0 for a recorded acceptance.
2. **The lecturer-only presentation fork obscures existing controls.** `PanelBrowse.flatViews` replaces the shared Requests/History switch with a Show dropdown, hides common filters behind More filters, and changes assignment columns. Lecturer enables it; Office and Coordinator do not. The shared refactor also reordered default filters for the other roles.
3. **Outgoing recommendations are hidden.** `LecturerPanelAppointments` wraps all submitted recommendations in a default-closed details element. Only the dedicated submitted route opens it automatically. These records are different from incoming review history.
4. **The Panel lecturer landing page lacks its summary row.** Supervisor Requests already has Supervisory load / Needs your review / Awaiting Coordinator. Panel only displays a workload card in My Panel students. Panel API already provides capacity and reservation facts; no new endpoint is necessary.
5. **History deep links can lose to remembered state.** `useListState` prefers saved view state over `initialHistory`. A saved Requests view with `initialHistory=true` still renders Requests; this was reproduced through the real renderer.
6. **Supervisor lecturer view switching retains incompatible statuses.** `LecturerAppointmentRequests` preserves status when switching Requests/History, while Student clears status and staff clears incompatible view filters. A pending status can make existing final History appear empty.
7. **Guidance and empty states diverge.** Panel shows nomination/replacement guidance on the incoming-review page and uses a generic no-matches message even when no filter is applied. Supervisor offers task-specific guidance and distinguishes no ongoing records from no matching records.
8. **Student Supervisor record return context is inconsistent.** Opening a request from My supervisors uses the Applications parent and fixed Back to Applications label rather than the actual originating overview. This is a separate, lower-priority navigation fix.
9. **Existing tests validate the wrong presentation contract.** `PanelFlatBrowse.test.tsx` explicitly requires absence of Request views. Seven current checks across six files pass while the acceptance/history and explicit-history-state diagnostic cases reproduce the defects. Passing tests did not prove role consistency.

## Three different record meanings

| Context | Requests/current | History/past |
|---|---|---|
| Lecturer incoming Panel reviews | Authenticated selected-panel queue requiring the lecturer's review | Authenticated review-history records: accepted, rejected, or cancelled before action. An accepted record can still await Coordinator approval. |
| Lecturer outgoing Panel recommendations | The lecturer's submissions still awaiting Panel or Coordinator | Final recommendation outcomes; not the lecturer's personal review decisions |
| Confirmed Panel appointments | ACTIVE appointment lifecycle records only | ENDED/COMPLETED appointment lifecycle records with recorded ending date/outcome |
| Existing Supervisor request workspaces | Ongoing workflow, including accepted requests awaiting Coordinator | Existing final workflow outcomes |

Do not globally redefine `panelRequestPending` to fix incoming history. Do not infer acceptance from cancellation, fabricate decision dates, treat acceptance as confirmation, or include outgoing submissions in incoming summary counts. Keep the existing Supervisor tracking policy: its accepted requests remain under ongoing Requests while Coordinator approval is pending. A different definition there would be an additional workflow decision, not an incidental UI repair.

## Proposed user experience

### Lecturer Panel: Appointment requests

Keep the existing tab name. Use the same section/header, visible Requests/History switch, summary-card primitive, filter styling and empty-state conventions as the lecturer Supervisor page.

On Requests, show three cards above the list:

- **Panel workload:** use the authoritative own-Panel workload response, which includes ACTIVE appointments and reserved SUBMITTED_TO_PANEL/PENDING_COORDINATOR nominations; show capacity state, semester and plan version. Never derive this from assignments.length because assignments includes past appointments.
- **Needs your review:** eligible, actionable incoming queue records, deduplicated before filters and pagination.
- **Awaiting Coordinator:** accepted incoming review-history records currently PENDING_COORDINATOR, deduplicated before filters and pagination.

Requests uses the incoming queue. History uses incoming review-history membership. Show the recorded Panel decision separately from the current workflow stage when needed, so Accepted / Awaiting Coordinator approval can both be understood. A cancellation with no Panel decision must say no decision was recorded, not rejected or accepted. History controls stay visible even if counts are zero. Mirror Supervisor's card visibility policy on Requests; do not invent zero counts during loading/errors.

Use relevant common filters visibly. Panel does not need the Supervisor primary/supporting request-type selector. Keep Programme, Semester, Status, dates and sorting available in the shared Panel filter layout; do not conceal them only for lecturers. Accepted History can display current waiting status without review actions. Provide context-specific no-requests, no-history and no-filter-matches messages.

### Lecturer Panel: My supervisees

Keep the searchable roster, current Panel name/staff ID, explicit student details, current/proposed replacement distinction, permission gates and the dedicated `panelStudent` parameter. Keep App's `student` parameter reserved for explicitly starting a nomination.

Display Submitted recommendations as an ordinary visible section beneath the roster. Retain its own existing workflow-based Requests/History control; it is not incoming review history. Within selected student details, keep the student-scoped recommendation list. Do not add duplicate all-student tables inside that selected student view.

### Confirmed appointment browsing

Restore the existing Current appointments/Past appointments switch consistently for all shared Panel consumers. Keep truthful end date/outcome visibility in past appointment browsing; do not tie these facts to the removed lecturer-only layout flag. Display the relevant appointment holder for each context (Panel member for staff monitoring; supervisor context can remain in lecturer detail). Do not confuse semester with lifecycle status.

### Shared-component boundary

Remove the visual `flatViews` mode. Reuse `RequestViewSwitch`, `WorkspaceSectionHeader`, `AppointmentSummaryCard`, shared buttons/selects and established filter/empty-state styling. Keep domain-specific data partitioning outside presentation.

`PanelBrowse` may accept an explicit request partition callback for incoming reviews; its default remains the current workflow partition used by outgoing/staff records. This is a documented data contract difference, not a second layout. Add optional controlled view/onViewChange so explicit History routes win over remembered state without changing all list storage to URL state.

Consumers requiring regression checks: lecturer incoming requests, lecturer outgoing recommendations (all/student-scoped), lecturer confirmed appointments, Coordinator requests/appointments, Office requests/appointments. Student Panel privacy and Supervisor role navigation remain guarded by their existing tests.

## Secondary fixes and intentional differences

- Clear incompatible status when lecturer Supervisor switches Requests/History, preserving applicable search/type/semester and resetting pagination. Offer statuses relevant to the selected view. No change to the underlying ongoing/final grouping.
- Fix the Student overview-to-request return target and label in a separate task using existing validated record-return context. Preserve direct-link fallback to Applications and its access checks.
- Preserve staff routine visibility rules for student-withdrawn Supervisor requests; changing these would be separate scope.
- Preserve existing disclosures for secondary supporting-appointment audit details. The complaint concerns the primary Submitted recommendations section; it is not authorization to expand every disclosure.
- Preserve Coordinator programme scope and Office monitoring/export/lifecycle administration. Summary cards for lecturers do not imply giving Office academic decision controls or adding the same metrics to every role.

## Acceptance evidence required

1. A recorded incoming acceptance awaiting Coordinator appears in incoming History and cannot be reviewed again. The same workflow status remains ongoing in outgoing/staff tracking and never appears as a confirmed appointment.
2. Accepted then approved/rejected/cancelled records retain the actual Panel decision and show the separate current workflow outcome. Cancelled-before-review has no fabricated decision.
3. Visible Requests/History controls render across all request-list consumers, with retained filters and explicit History routing behaving predictably.
4. The three Panel lecturer cards use unfiltered authenticated source data, with a fixture containing both active and ended assignments and reserved nominations.
5. Submitted recommendations is visible on entering My supervisees, including records for former supervisees.
6. Roster search/status/page and detail return continue working; viewing details never starts a nomination automatically.
7. All eight role/module paths are checked for their own permitted navigation, scope, actions and privacy, not forced into identical screens.
8. Browser evidence covers Requests, incoming History, My supervisees and current/past appointments. If a demo fixture is absent, label synthetic verification honestly and leave academic records unchanged.

Implementation requires the user's approval of this proposed correction. The current audit made no implementation changes.
