# Office Dashboard and linked tools: manual test guide

Prepared 19 October 2026 from the current working-tree documentation and source code.

This is a test plan, not an executed acceptance report. No browser tests, academic mutations, or regression suites were run to prepare it. Existing uncommitted application changes are included in the source reviewed. Record actual results separately.

## 1. Scope and source of truth

The agreed scope is **Dashboard and its linked tools**:

| Entry point | Route | Purpose |
| --- | --- | --- |
| Administration Dashboard | `/dashboard` | Semester context, calendar, attention counts, Action Centre |
| Manage Timeline | `/dashboard/timeline` | Calendar entries/imports, appointment intake, deadline extensions |
| Academic semester Manage | `/dashboard/semesters` | Semester creation, activation, extension, closure, archival |
| Lecturer Capacity | `/dashboard/lecturer-capacity` | Versioned Supervisor/Panel limits and unavailability |
| Manage Participants | `/dashboard/participant-lifecycle` | Academic eligibility and acting coordinator grants |
| Reconcile Workflows | `/dashboard/workflow-reconciliation` | Detect inconsistencies and apply permitted audited repairs |
| View Workflow Reports | `/dashboard/reports` | Current-state analytics, attention links and XLSX |
| View student record | `/dashboard/progress/:studentId` | Authorised student dossier |
| Supervisor workload | `/supervisor-appointments/workload` | Active primary/supporting supervision and capacity |
| Panel workload | `/panel-appointments/workload` | Active appointments plus pending reservations |

Supervisor/Panel/Marks screens reached from Dashboard are covered for navigation and cross-module effects. Full testing of those independent sidebar modules is outside this guide.

Use these sources in this order:

1. `PROJECT_REQUIREMENTS.md`: intended business rules. Its recent explicitly superseding entries take precedence over older descriptions.
2. `ARCHITECTURE_AND_CODING_DESIGN.md`: ownership, API boundaries and implementation design.
3. `PROJECT_STATUS.md`: recorded implementation, previous verification and known limitations; previous passes do not establish a pass for this run.
4. Current `frontend/src/App.tsx`, `frontend/src/constants/routes.ts`, components and backend services: actual wiring and enforcement. If this disagrees with a requirement, record the disagreement instead of redefining the requirement.
5. Older `WHOLE_SYSTEM_END_TO_END_TEST_GUIDE.md` and `SIMPLE_END_TO_END_TEST_GUIDE.md`: background only where still current. Appointment exports are now XLSX, deadline management is connected, and primary Supervisor replacement is Office-initiated.

Principal source files reviewed:

- Frontend components: `AdministrationDashboard`, `ActiveSemesterContext`, `DashboardTimeline`, `TimelineCalendar`, `MonitoringTasksCard`, `TimelineManagement`, `AddTimelineEntryDrawer`, `EditTimelineEntryDrawer`, `UploadTimelineDrawer`, `OperationalPeriodManagement`, `AcademicSemesterManagement`, `ClosureReview`, `LecturerCapacityManagement`, `ParticipantLifecycleManagement`, `CoordinatorDelegations`, `WorkflowReconciliationCentre`, `WorkflowReports`, `StudentProgressDossier`, `SupervisorWorkloadMonitoring`, `PanelWorkloadMonitoring`.
- Frontend helpers/services: `lecturerCapacityApi.ts`, `lecturerCapacity.ts`, `participantLifecycle.ts`, `studentProgress.ts`, `workflowAgeing.ts`, `operationalPeriodAccess.ts`, `timelineUploadValidation.ts`.
- Backend: `dashboard/views.py`, `dashboard/actions.py`, `dashboard/reconciliation.py`, `dashboard/reports.py`, `academics/capacity.py`, `academics/capacity_services.py`, `academics/operational_period_views.py`, `accounts/participant_lifecycle.py`, `accounts/delegations.py` and their relevant test scenarios.

## 2. Prepare a controlled run

1. Use the development/test database with fictional participants. Start with Office Staff/Admin. Use separate browser profiles for Student, Lecturer and Programme Coordinator checks.
2. The latest status document records frontend `http://127.0.0.1:3001` and backend `http://127.0.0.1:8000`; verify they are running. These addresses were not probed during this review.
3. Use the private ignored account sheet for credentials. Never copy passwords, cookies or tokens into test evidence.
4. Label created entries, periods and reasons `UAT-20261019-<case ID>`. Record actual semester, lecturer and student IDs before editing.
5. Have a Draft semester, an effective Active semester and historical Closed/Archived data. Non-archived semesters cannot overlap. Do not activate a future semester merely to make one button pass.
6. Have eligible Supervisor and Panel lecturers, a Student without appointments, a supervised Student, pending requests, active appointments, and unfinished/submitted Marks tasks. Use additional spare participants for terminal lifecycle tests.
7. Obtain any missing fixtures through the legitimate setup process. An empty list is not proof that its row actions work. Mark missing-fixture scenarios **BLOCKED**.

For every save or transition: note the original value, perform the action, check the result, reload, re-open it, then inspect the relevant other-role view and audit. A success toast alone does not pass a case.

Run in this order: read-only Dashboard checks → Draft semester/capacity setup → timeline/period controls → workload effects → reports/dossiers → delegation and reversible lifecycle → repairs → handover/closure/terminal lifecycle.

**Operations with broad effects:** Confirm Import replaces the selected semester's current calendar; publishing capacity changes selection/approval eligibility; enabling intake enforcement blocks unmatched submissions; semester activation can close the previous semester and its Marks periods; withdrawal and retirement have lasting effects. Execute those cases only on the designated test data, with closure/terminal cases last.

## 3. Dashboard Overview

| ID | Control or scenario | Steps and expected result |
| --- | --- | --- |
| D01 | Initial load and semester context | Open `/dashboard`. Verify Administration Dashboard, academic semester label/status, timeline, Records Needing Attention and Action Centre. Compare the semester with Academic Semesters. No active semester must be reported honestly. |
| D02 | Header buttons | Click **Lecturer Capacity**, **Reconcile Workflows**, **Manage Participants**, **View Workflow Reports** individually. Each opens its route above; its Back button returns to Dashboard. |
| D03 | Semester **Manage** | Opens Academic Semesters. This is separate from Manage Timeline. |
| D04 | **Manage Timeline** | Opens Timeline Management directly. Returning retains a usable Dashboard. |
| D05 | Research phase buttons | Select **Research Project 1** and **Research Project 2**. Only that phase's entries display. A phase without entries shows an empty state. |
| D06 | Calendar event labels/bars | Open a short event, a long event and overlapping events. Check title, complete detail, phase and exact dates; close the detail view. Each event has its own row, proportional duration and readable wrapping. |
| D07 | Pending supervisor **Open** | Opens Supervisor Appointments. Current summary counts lecturer-review primary requests plus co-supervisor candidate-review requests; do not compare this number with all requests or with Coordinator-only approvals. Record any mismatch between count and destination scope. |
| D08 | Pending panel approvals **Open** | Opens Panel Appointments. Its count represents nominations awaiting Coordinator approval, not every pending selected-Panel review. |
| D09 | Incomplete mark entries **Open** | Opens Mark Records. Current handler selects **All Records**; independently reconcile incomplete count to active, unsubmitted tasks. Paused/retired tasks must not inflate operational totals. |
| D10 | Backup evaluator assignments **Open** | Opens Mark Records, currently All Records. Count represents active backup tasks, including submitted ones; do not assume it means only unfinished backups. |
| D11 | Lecturers near panel workload limit **Open** | Compare count with workload rows labelled Near Limit or Full Load. Test whether Open reaches the promised workload screen; current source routes to general Panel Appointments (see gaps). |
| D12 | Every Action Centre item | Click each returned task type present in the fixture: request, Marks record, timeline, reconciliation, capacity or setup action. Verify correct destination and record. Count badge is the number of returned action items, not total underlying records; backend caps actions at 20. |
| D13 | Action Centre after work changes | Resolve one test request/task through its responsible role. Reload Dashboard; completed action disappears or changes to the next appropriate stage. Office monitoring must not imply Office performs lecturer/Coordinator decisions. |
| D14 | Empty, loading and failure | Check no timeline/no actions and controlled failed requests. Action Centre and timeline provide Retry. A failed summary/workload request must not be accepted as zero or left indefinitely loading; current source has a risk here. |

The current Dashboard has no general Refresh, New Entry or Export Report button. Reload the browser for Overview counters; test the controls actually rendered. Calendar/Action Centre error Retry controls are conditional.

## 4. Academic Semesters

| ID | Control or scenario | Steps and expected result |
| --- | --- | --- |
| S01 | Lifecycle filters | Try **All, Draft, Active, Closed, Archived**, and **Include archived**. Archived rows require inclusion as well as the relevant filter. Empty combinations remain understandable. |
| S02 | **New semester → Create draft** | Enter a unique consecutive session such as `2027/2028`, valid term and ordered non-overlapping dates. Create, reload and Open the row; metadata persists. Choose dates appropriate to the test environment. |
| S03 | Draft validation | Try blank/non-consecutive session, reversed dates and overlap with a non-archived semester. Reject without creating a record. |
| S04 | Row **Open → Save changes** | Edit a Draft. Reload and check values/audit. Active, Closed and Archived configuration fields must be read-only. |
| S05 | **Activate** with missing policy | Use a Draft with no complete Published capacity plan. Supply reason and review preview. Activation fails without closing the current semester or its Marks periods. |
| S06 | **Activate / Confirm closure / handover** | After publishing complete capacity, review unfinished-task preview and acknowledge if requested. Confirm with reason. One semester becomes Active; previous Active and its published Marks periods close atomically. Record all affected IDs. |
| S07 | Preview/confirmation guards | Blank reason, missing required acknowledgement, Cancel, preview load failure/Retry and stale two-tab preview. No unconfirmed transition; changed data requires fresh review. |
| S08 | **Extend end date → Confirm** | Use a later non-conflicting end date and reason. Earlier/equal dates reject. Audit retains change. Semester extension alone does not extend Marks or appointment deadlines. |
| S09 | **Close** | Last: inspect unfinished Marks counts, reason and acknowledgement, confirm. New ordinary intake and Marks writes are blocked as applicable; submitted Marks and history remain. Eligible task completion windows are a separate exception. |
| S10 | **Archive → Confirm** | Test a spare Draft and an eligible Closed semester with reason. Active cannot archive directly; live completion windows on unfinished work must block archival. Archived history remains readable; Closed cannot reactivate. |
| S11 | Audit and navigation controls | Re-open after transitions: correct actor/action/reason/date. Audit read failure and Retry must not repeat a successful transition. Test **Lecturer Capacity**, **Manage participants**, **Reconcile Workflows**, **Back to Dashboard**. |

## 5. Lecturer Capacity: all visible controls

Capacity is the policy; workload is the occupied slots. Draft edits do not become operational until published. Limits are independent for Supervisor and Panel.

| ID | Control or scenario | Steps and expected result |
| --- | --- | --- |
| C01 | Academic semester selector | Switch Draft/Active/Closed/Archived. Plan history, dates, lecturer entries, restrictions and audits match the selected semester. Historical changes are disabled. |
| C02 | **New Draft / Create Draft plan** | Create a blank Draft on a permitted semester. Version/origin persists. Required limits are explicit publication blockers until completed. This is not the same as copying a prior semester. |
| C03 | Plan-history version buttons | Select each available vN Draft/Published/Superseded. Inspect status, readiness, origin and Supersedes reference. Published/Superseded versions have no direct limit editing. Distinguish selected version from operational Published version. |
| C04 | Search and role selector | Search lecturer name/staff number; try All roles/Supervisor/Panel and no match. These filters apply immediately. Lecturer without a role shows the appropriate absence, not a fabricated limit. |
| C05 | **Edit → Save Limits** | On Draft set independent integer limits for all required roles. Save, reload, verify exact numbers/audit. Changing Supervisor must not alter Panel. |
| C06 | Limit validation and Cancel/Back | Try blank required limit, negative, decimal and zero. Reject invalid values; zero is valid. Dirty navigation offers the shared keep-editing/discard behaviour; discarded edits do not save. |
| C07 | **Publish Plan** availability | Incomplete/readiness-blocked Draft cannot publish. With complete coverage, open publication form; blank reason or unchecked confirmation prevents submission. Back/close saves nothing. |
| C08 | **Publish Capacity Plan** | Enter reason, confirm and publish. Target becomes immutable Published; prior Published becomes Superseded; exactly one operational Published policy remains. Audit records actor/reason and survives reload. |
| C09 | **Clone Version** | Select a Published or Superseded version and clone. New Draft increments version and retains source lineage. It is editable; the source remains unchanged. Clone is disabled on a selected Draft. |
| C10 | **Compare** | With two versions, choose each comparison version and verify per-lecturer Supervisor/Panel limits. Comparison has no save side effect. With fewer than two versions Compare is disabled. |
| C11 | **Add Availability → Record Availability** | Choose lecturer, role, semester-contained start/end and reason. Save. Check current versus upcoming dates. Supervisor restriction does not also restrict Panel. Existing appointments stay active. |
| C12 | Availability validation | Reject reversed/out-of-semester dates, empty reason, wrong-role lecturer and overlapping uncancelled same-role windows. A separate role window may coexist. |
| C13 | Restriction-date link → **Cancel Restriction** | Open a clickable current/upcoming restriction in lecturer row. Require cancellation reason and checkbox. Cancellation preserves original window and adds history; it does not delete or reactivate it. |
| C14 | Historical restrictions | Requirement permits valid cancellation after semester closure. Check whether a reachable cancellation control exists for the particular historical window; expired windows are not clickable in the current table. Record UI limitations separately from API support. |
| C15 | Stale two-tab edit/publication | Open same Draft in two sessions. Save in A then try old edit/publication in B. B gets a conflict, retains command context and reloads latest policy; no overwrite or duplicate audit. |
| C16 | Closed/Archived policy | New Draft, Clone, Edit, Publish and Add Availability unavailable. History/Compare still readable; authorised historical cancellation follows C14. |
| C17 | **Back to Dashboard / Retry** | Verify both. Also enter capacity from semester, reconciliation and both workload pages. Check results again after reload. |
| C18 | Copy previous semester requirement | Current capacity screen has no visible copy action. Do not label New Draft or same-semester Clone as a passed prior-semester copy test. A narrowly eligible reconciliation issue can offer a copy repair; otherwise record the UI gap. |
| C19 | Large history coverage | With over 100 plans/windows/audits, check completeness. Current component requests only the first 100 of each and has no history paging controls; do not claim complete history from the visible list. |

### Worked capacity/workload exercise

Use disposable records and the effective Active semester's Published plan. Check capacity, workload, candidate selection and approval effects after each step.

| Step | Action | Expected numbers/behaviour |
| --- | --- | --- |
| 1 | Publish Panel limit 3 for lecturer A with 2 active Panel appointments and no pending nominations | Active 2, reserved 0, occupied 2, available slots 1; authoritative state Available. A presentation may also call this Near Limit. |
| 2 | Submit one valid Panel nomination naming A | Active 2, reserved 1, occupied 3, slots 0, Full. Another nomination cannot take an extra slot. |
| 3 | Selected Panel accepts | Still active 2/reserved 1 while awaiting Coordinator; acceptance is not final appointment. |
| 4 | Coordinator finally approves | Active 3, reserved 0, occupied 3. Reservation converts once; total must not become 4. |
| 5 | Clone/publish limit 2 | Active 3 remains; Over Capacity, slots 0. No existing appointment is silently removed. New assignments block. |
| 6 | Restore a suitable policy and record effective Panel unavailability | Temporarily Unavailable while window applies; existing appointments remain. Internal reason stays Office-only. A future window must not block today early. |
| 7 | Cancel restriction with reason | Capacity resolves from current policy/workload again; cancellation and original window remain in history. |
| 8 | Repeat independently for Supervisor | Load counts active primary plus supporting appointments globally across semesters. Pending Supervisor/co-supervisor requests do not reserve slots; final approval rechecks capacity. |
| 9 | Set zero limit on a fixture | With no load, Full; with positive load, Over Capacity. No negative slots or invalid progress values. |

Authoritative precedence: Ineligible → Not Configured → Temporarily Unavailable → Over Capacity → Full → Available. Progress displays stay within 0–100%; preserve raw counts even when over capacity.

## 6. Workload monitoring linked from Dashboard

Use the Panel/Supervisor workspace **Tools** workload action when the Dashboard shortcut does not lead directly there.

| ID | Control or scenario | Steps and expected result |
| --- | --- | --- |
| W01 | Supervisor search/Department/Workload Status + **Apply Filters** | Change name/ID/department and Available/Near Limit/Full Load. Nothing is applied until Apply Filters. Combine filters, try no match, reset manually to all values and apply. Summary cards currently describe the full loaded set, not only filtered rows. |
| W02 | Supervisor **View** | Check lecturer identity, active primary and supporting students, research, appointment dates, limit, semester/plan version/state and public unavailability date. Back returns to monitoring. |
| W03 | Supervisor previous/next page | Check boundary disabled states and filter changes reset/clamp page. No duplicate/missing lecturers. |
| W04 | Supervisor **Export Excel** | Download real XLSX containing all filtered lecturers across pages, not only visible page. Check limits, state, active/reserved load, semester/version, primary/co-supervisee counts. |
| W05 | Panel search/Department/Capacity state | Filters apply immediately. Check combined/no-match results and **Clear filters**. Distribution counts cover filtered lecturers across pages. |
| W06 | Panel **View** | Verify active appointment and pending reservation items separately, occupied total, slots, semester/version and state. Back returns correctly, including links opened for a particular lecturer. |
| W07 | Panel pagination and page size | Change size, move first/last/previous/next pages where rendered; filters reset page. Counts and items stay consistent. |
| W08 | Panel **Export Excel** | All filtered lecturers exported to XLSX with numeric counts and active/reserved item details. Missing policy stays Not configured; do not accept an invented operational limit. |
| W09 | Both **Manage Capacity**, Back and Retry | Correct routes, clear loading/empty/errors; use reload/re-entry to verify authoritative changes. Do not rely on automatic refresh being implemented identically in both monitors. |
| W10 | Cross-role privacy/selection | Full, Over Capacity and Not Configured candidates cannot be selected where returned. Ineligible/temporarily unavailable candidates are omitted. Persisted selections may show public resume date; Office restriction reasons must not leak. Final approvals recheck changes made since selection. |

## 7. Timeline Management, imports and operational deadlines

### Calendar controls

| ID | Control or scenario | Steps and expected result |
| --- | --- | --- |
| T01 | Timeline semester and **Manage semesters** | Switch Draft/Active/Closed. Entries, totals and audits follow selection. Archived is excluded. Selector is locked while a calendar form or period interaction is open. Manage semesters opens its workspace. |
| T02 | **Download Template** | Download/open `.xlsx`; dates correspond to selected semester, columns are intact. Also test the template button inside Upload Timeline. |
| T03 | **Add Timeline Entry → Add Entry** | Add labelled title, P1/P2, ordered dates, target-role toggles and detail. Reload; correct calendar row/detail, total and ADD audit. Try Student, Lecturer and Office Staff audiences independently. |
| T04 | Add/Edit validation | Blank title, no target role, reversed/out-of-semester dates must not persist. Cancel/Back with dirty fields offers keep-editing/discard; no accidental mutation. |
| T05 | Row **Edit → Save Changes** | Update an informational entry's title/detail/dates/phase/audience. Reload; former values no longer appear as current; EDIT audit retained. |
| T06 | Linked row **Manage period** | Scrolls to its owning appointment/Marks period. Linked dates are controlled by that period; ordinary edit cannot independently override them. |
| T07 | Delete icon / **Delete Entry** | Cancel confirmation first and verify unchanged. Confirm deletion only for a disposable event; event disappears and deletion audit remains. Deleting a calendar event must not be mistaken for closing/deleting its operational period. |
| T08 | Search/Category/Status/Target Role + **Apply Filters** | Verify each and combinations; current role filter exposes Student/Lecturer only although entries can target Office Staff. Restore All/blank and Apply. No-match state is clear. |
| T09 | Calendar P1/P2/event detail | Same checks as D05–D06, including multi-month, same-day, long labels and overlaps. Expired dates mean **Ended**, not proof a student completed the activity. |
| T10 | Recent updates page buttons/arrows | Check 10-row pages, first/last disabled states, actor/action/details and extension reasons/before-after dates. Backend currently returns only the latest 50 timeline logs; pagination is not full archival history. |
| T11 | Closed semester and Back/Retry | Calendar add/edit/delete/upload/template disabled. Closed semester retains selected unfinished Marks recovery controls below. Back returns to Office Dashboard; failures provide usable Retry. |

### Upload Timeline: replacement workflow

| ID | Control or scenario | Steps and expected result |
| --- | --- | --- |
| I01 | **Upload Timeline / Browse File / drag-drop** | Select a valid `.xlsx` up to 10 MB. Correct filename/target semester shown. **Clear Selected File** removes selection and prior preview. |
| I02 | File/row validation | Try wrong extension, oversized or corrupt workbook, missing required columns, bad dates/roles, duplicate/conflicting rows. Reject with useful feedback; existing timeline/audit stays unchanged. |
| I03 | **Preview** | Review row count, dates, phase and informational/period links. Before confirmation reload from another tab: no timeline or audit mutation. |
| I04 | Warnings/acknowledgement | Acknowledgable past informational entries produce warnings; required checkbox gates **Confirm Import**. Linked operational dates must agree with same-semester owning periods. A warning cannot authorise silent operational date changes. |
| I05 | **Confirm Import** | Confirm reviewed workbook. Selected semester current calendar is replaced atomically with exactly the reviewed rows. Verify count, audit and Dashboard audience views. Periods are not silently published/extended. |
| I06 | Stale/switch/cancel | Change file after preview, modify timeline/period in another session, or let preview expire. Confirmation must require a new preview; original/current saved timeline survives failed import. Cancel/Back/dirty discard creates no replacement. |

### Operational periods and extensions

Calendar P1/P2 labels do not decide student project stage. Appointment intake and Marks periods are the authority for operational access.

| ID | Control or scenario | Steps and expected result |
| --- | --- | --- |
| O01 | **Create appointment period → Create draft** | Select Supervisor applications or Panel recommendations, unique name, All/Selected programmes and exact Malaysia opening/deadline. Draft persists; does not itself enable enforcement. |
| O02 | **Edit draft → Save draft** | Change permitted fields with required UI change reason. Reject reversed/out-of-semester dates or Selected scope with no programmes. Publishing overlapping periods for the same activity/cohort must reject. |
| O03 | **Publish period → Confirm change** | Review dates/scope and confirm. Publishing and enforcement remain separate. Cancel saves nothing. |
| O04 | **Enable enforcement / Disable enforcement** | Requires reason/confirmation; enabling requires Published configuration. With enabled rules, check before opening, within window and after deadline; missing/ambiguous cohort period blocks new submission. Existing submitted reviews remain actionable. Disable only in designated test setup. |
| O05 | **Extend deadline → Everyone in period scope → Save extension** | Use later future deadline, within semester, and reason. Owning period and linked calendar update; relevant applicant/lecturer sees effective deadline. Empty reason, earlier/still-expired deadline and stale revision reject. |
| O06 | **Extend deadline → Selected cases / tasks** for appointment | Select eligible Student and participant, future personal deadline and reason. Only that case receives extra time; another Student stays blocked. Panel exception belongs to the relevant current primary Supervisor and student, not arbitrary participant. |
| O07 | **Period and extra time history / Close history** | Verify actor, reason, old/new dates and personal grants. **Revoke extra time** requires reason/confirmation, blocks that exception and retains history. Check expiry and renewal/supersession with suitable fixtures. |
| O08 | **Close intake / Archive period** | Require reason/confirmation; controls follow lifecycle: Published can close; Draft/Closed can archive. New intake blocked; prior requests/history preserved. |
| O09 | **Link calendar event → Link event** | Choose existing unlinked same-semester event explicitly. Correct owner shown; dates follow owner and later extension. Wrong-semester/conflicting linkage must reject; titles alone never infer links. |
| O10 | Marks **Link calendar event / Extend deadline** | Marks setup, rubric, targeting, publication and assignment remain in Marks module. On eligible published period in editable semester, common extension uses period deadline; selected tasks receive completion windows. |
| O11 | Closed-period/semester Marks recovery | Select **Extend deadline → Selected cases / tasks** and eligible unfinished task(s). Grant future window/reason. Assigned lecturer can submit during window while period/semester stays Closed. Submitted/retired/ineligible tasks cannot be reopened through this control. |
| O12 | **Completion window history** task selector | Inspect each selected task; **Revoke completion window** requires reason and preserves prior grant. Expiry/revocation removes exceptional submission access. Common/everyone extension is unavailable where lifecycle forbids it. |
| O13 | Informational event **Extend deadline** | Whole Malaysia calendar day and reason; only Everyone scope. Updates event/audit, not appointment or Marks enforcement. Earlier/out-of-semester/stale changes reject. |
| O14 | Period errors and confirmation navigation | **Retry periods**, conditional histories, loading/no eligible cases, Cancel, Back, dirty keep-editing/discard, double-click prevention and stale two-tab commands. No partial changes or misleading success. |

Reminder delivery is a separate activation concern. Status records the installed local scheduler as preview-only; do not mark live reminder/email delivery passed because dates changed or a notification appeared. Inspect configured delivery and deduplication separately if live reminder testing is later requested.

## 8. Participants and acting coordinator grants

| ID | Control or scenario | Steps and expected result |
| --- | --- | --- |
| P01 | Search, participant type, lifecycle, programme | Filters apply after a short debounce. Review all Students/Lecturers, combinations/no-match and summary counts. |
| P02 | Row **Review** | Correct participant, academic state, account access, active-work blockers, pending workflows and audit. Quickly select different records; late responses must not show the wrong person's details. |
| P03 | Student **Deferred → Confirm** | Reason required; Cancel first. Confirm on spare active Student: appointments remain, pending decisions/new requests block, unfinished Marks pause and leave operational denominators. Submitted results/history remain. |
| P04 | Deferred Student **Active → Confirm** | If original period still accepts work and appointment is valid, paused tasks resume; otherwise tasks retire with draft history preserved. Test both with separate fixtures. |
| P05 | Pending-work **Cancel → Confirm** | Mandatory reason; test cancellation Back/Cancel first. Confirm appropriate request cancellation; workload reservations release where applicable and history remains. This is distinct from lifecycle withdrawal. |
| P06 | Lecturer **Retiring → Confirm** | Reason required. New nominations/backup assignments block; existing decisions remain resolvable. **Active** restores eligibility through the permitted transition. |
| P07 | Student **Graduated / Withdrawn → Confirm** | Last, on separate spare Students. Graduation blocked by unresolved workflows/unfinished operational Marks. Successful graduation completes appointments; withdrawal cancels pending work, ends appointments and retires unfinished tasks. Both preserve submitted history. |
| P08 | Lecturer **Retired → Confirm** | Last, on spare Retiring Lecturer. Block while active appointments, pending decisions or managed Coordinator responsibility remain. After eligible retirement, login/session access disabled and portal transition is terminal. |
| P09 | History/Retry/Back/navigation | Confirm actor/reason/date and state after reload. No double transition under repeated clicks. Test **Reconcile Workflows** and **Back to Office Dashboard**. |
| G01 | **Grant acting access** | Select additional programme and active Coordinator from another regular programme, start today/future, inclusive end date, justification; **Create grant**. Saved grant shows actor/status/dates. Regular programme retained. |
| G02 | Grant validation/Cancel | Blank fields/reason, past start, reversed dates and overlapping acting coverage reject. Own regular programme is not an additional grant. Cancel creates nothing. |
| G03 | Coordinator effect | Refresh/re-login as grantee: additional programme queues, approvals, reports and permitted dossiers accessible only during grant. A scheduled grant must not grant early access. |
| G04 | **Revoke → Confirm revocation** | Reason required; Cancel first. After revoke, additional scope disappears across queues/API/export/dossier; regular scope remains. Original and revocation history persist. Expired grant also removes scope. |

## 9. Reconciliation, reports and student dossier

### Reconcile Workflows

| ID | Control or scenario | Steps and expected result |
| --- | --- | --- |
| R01 | Scan and filters | Check totals/classifications; search record/student/programme, module, severity, repairability and programme. Try no match, page arrows and Retry where rendered. Reading/scanning does not repair records. |
| R02 | **Preview** | Inspect current affected record, identifiers, severity, dependencies and allowed resolution. No write or repair audit yet. |
| R03 | **Open Source Record** | When offered, opens the correct owning record. Back to Reconciliation preserves usable navigation. |
| R04 | Repair controls | Only Repairable issues with allowed resolutions offer **Apply Audited Repair**. Select permitted resolution/programme if needed; mandatory reason plus checkbox, then final confirmation. Cancel/dirty Back do not apply. |
| R05 | **Apply audited repair** | On a legitimate disposable fixture, apply once. Re-scan; inconsistency resolved/changed and immutable audit identifies actor/reason/affected records. Submitted Marks and original approval attribution remain. |
| R06 | Review-required issue | Dependencies visible; no Apply action. Do not edit database records to manufacture inconsistencies during UAT. If no safe repair fixture exists, mark repair execution BLOCKED. |
| R07 | Stale preview | Open in A, resolve/change underlying state legitimately in B, apply stale A. Conflict requires fresh preview, with no second/partial repair. Test **Lecturer Capacity** and Dashboard Back. |

### Workflow Reports

| ID | Control or scenario | Steps and expected result |
| --- | --- | --- |
| A01 | Initial active-semester report | Compare persisted Supervisor/Panel lifecycle counts, waiting owners/age bands, Marks completion, milestones and participant counts with same-scope source records. Counts are records, not unique students. |
| A02 | Dates/semester/programme + **Apply filters** | Check Active/All/Legacy-Unassigned/specific semester and programme. Reversed dates reject. Pending input changes show unapplied notice; **Reset filters** returns active/default. |
| A03 | Reporting date semantics | Supervisor uses submission date; Panel submission or creation fallback; Marks period closing date or assignment fallback; Timeline start date. Report shows current state of matched records, not historical state as of the selected date. |
| A04 | **Download XLSX** | Verify real workbook and values against **applied** filters, including empty datasets and leading-zero/Unicode identifiers. Unsaved filter edits must not affect download. Export creates no issued/stored report record. |
| A05 | Attention **Open / View team** | Each present record type navigates to correct request/team/Marks/reconciliation/lifecycle destination. Waiting age is informational, not overdue; Marks overdue uses effective deadline including valid extra time. |
| A06 | **View student record** | Opens correct dossier. **Reconcile Workflows**, **Back to Dashboard**, error Retry and no-data states work. |
| A07 | Scope checks | Coordinator sees authorised regular/acting programmes only; Lecturer sees assigned work; Student cannot access administrative reports. Non-Office must not receive faculty capacity summary/internal availability reasons. |

### Dossier reached by View student record

| ID | Control or scenario | Steps and expected result |
| --- | --- | --- |
| V01 | Section tabs | Office can inspect Overview, Supervisor, Panel, Marks and Timeline when returned. Current records/history agree with owning modules, including lifecycle/replacement and supporting supervision. |
| V02 | **Open record**, team/history and participant links | Test each offered destination, contextual Back and reload. Dossier itself does not approve, submit, print or export records. |
| V03 | Privacy/error states | Wrong/nonexistent student identity gives equivalent not-found protection for unauthorised users. Student self-view has no Marks section, internal Panel stages/pending actor or staff audits. Coordinator/Lecturer see only permitted sections/records. Retry and empty states remain clear. |

## 10. Checks to repeat on every screen

- **Persistence:** refresh and re-login after mutation; compare exact record IDs, not only labels/toasts.
- **Cancel and navigation:** form Back, Cancel, close icon/overlay/Escape where supported, browser Back, direct-route reload, unsaved keep-editing/discard and busy-state controls. No accidental save or duplicated operation.
- **Permissions:** repeat Office-only direct routes as Student/Lecturer/Coordinator. Frontend redirects before showing management content; underlying management API must deny too. Reports/dossiers retain their explicit role-scoped access.
- **Validation:** blank/whitespace reasons, zero and boundary numbers, out-of-range dates, stale two-tab state and repeated clicks. Invalid operations have no partial mutation/audit.
- **Exports:** open the actual workbook, compare matching records across pages, preserve text identifiers/line breaks, keep counts numeric, ensure untrusted text is literal rather than executable formulas, exclude private reasons where required.
- **UI:** desktop and 390px width, keyboard Tab/Enter/Space, labelled icon controls, readable long content, scrollable tables, no clipped confirm buttons or persistent console/network failures.
- **Date/time:** test Malaysia midnight and a different browser timezone. Periods/deadlines should use Malaysia time. Several audit displays currently use browser locale without an explicit timezone; log any date/time shift.
- **Error recovery:** controlled failed reads/writes, readable error, correct Retry and no false zero/success. A failed follow-up read after successful mutation must not submit the mutation again.

## 11. Source-level gaps to prioritise in this run

These are observations from source inspection, not reproduced browser defects or fixes:

1. **Dashboard workload destination:** the panel-limit row announces workload monitoring but invokes generic Panel Appointments navigation. Record the actual destination and additional steps needed.
2. **Dashboard coupled failure:** summary and workload share `Promise.all`; failure of either leaves summary null, so several counters can remain `Loading...` while workload shows Unavailable, without a summary Retry control.
3. **Capacity prior-semester copy:** service supports `copyFromPlanId`; workspace New Draft calls creation without it. No dedicated copy selection/button exists. Reconciliation offers copying only under its narrow safe conditions.
4. **Capacity history coverage:** component loads plans/windows/audits with `limit: 100` and no offset traversal/history paging. Check large datasets before accepting “complete history”.
5. **Historical restriction cancellation:** management API supports historical cancellation, but row cancellation links cover only uncancelled current/upcoming windows (`endsOn >= today`); history cards have no cancellation button.
6. **Selected versus operational capacity version:** the card labelled Current policy displays the selected history version, which can be Draft or Superseded. Operational authority remains the Published version; verify labels do not mislead the tester.
7. **Report capacity presentation:** requirements/backend include Office capacity summary; the report component reviewed does not visibly render a dedicated faculty capacity-summary block. Check JSON/XLSX and UI separately; do not infer UI coverage from export support.

If following an attention link into primary Supervisor replacement, consult `SUPERVISOR_REPLACEMENT_REVIEW_2026-10-19.md` and the latest `PROJECT_STATUS.md`: duplicate case-only lecturer-ID errors and blocked/stale form recovery were initially deferred, and a concurrent task now records fixes with verification in progress. Recheck the final status before treating those findings as open or resolved. Follow the current Office-initiated replacement policy.

## 12. Record results and decide completion

Use one result per case, splitting rows into subcases when testing multiple controls:

| Case | Actor | Semester / participant / record | Input or action | Expected | Actual | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C05-a | Office | Fill exact IDs | Supervisor 4, Panel 2; Save Limits | Draft saved, Published unchanged; audit | Fill after execution | NOT RUN | Screenshot / response / reload check |

Allowed results: **PASS, FAIL, BLOCKED, NOT RUN**. A disabled control passes only when its documented prerequisite is absent; an absent fixture is BLOCKED. A source-level limitation is not a passed feature. Record expected/actual, screenshot, HTTP status if available and reload/other-role evidence for failures.

Complete the Dashboard UAT only when each applicable control and conditional branch above has evidence, capacity/workload arithmetic reconciles, role privacy holds, and failures/blockers are listed explicitly. Existing automated-test results are supporting evidence only; this manual run remains unexecuted until you carry it out.
