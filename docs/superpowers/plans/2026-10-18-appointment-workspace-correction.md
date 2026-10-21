# Appointment Workspace Correction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Restore predictable appointment workspace presentation while correctly separating incoming review history, outgoing recommendation tracking and confirmed appointment lifecycle.

**Architecture:** Reuse the existing request switch, summary cards and shared UI primitives. Remove the lecturer-only visual mode, keep incoming-review membership as an explicit data policy, and preserve the existing workflow partition for other consumers. Keep backend authorization and transitions unchanged.

**Tech Stack:** React 19, TypeScript 5.8, react-router, existing node:test + tsx renderer tests, Django REST APIs and existing isolated backend tests.

**Spec:** `docs/superpowers/specs/2026-10-18-appointment-workspace-correction.md`

**Status:** Complete. Implemented and verified on codex/portal-consistency-and-toast; no commit or push.

## Global Constraints

- Preserve existing tab names and purpose-specific role scope.
- Preserve authentication, programme scope, decision authority, document rules, capacity checks and appointment lifecycle transitions.
- Preserve pending Panel identity privacy on the Student page.
- Do not change the Supervisor Section A application work.
- Do not introduce dependencies, database migrations, new approval stages or a global navigation rewrite.
- Do not commit, push, reset the dirty checkout, or modify academic records as part of this plan.
- Shared presentation changes must be enumerated and checked against every consumer.

## Task 1: Separate incoming Panel review membership from workflow status

**Files:** Create `frontend/src/utils/panelReviewWorkspace.ts` and `.test.ts`; modify `frontend/src/components/PanelBrowse.tsx`, `LecturerPanelAppointments.tsx`, `PanelWorkspace.test.tsx`.

**Interfaces:**

```ts
type RequestListView = 'requests' | 'history'; // existing shared type
// New helper consumes authenticated incoming queue/history only.
export function buildPanelReviewWorkspace(
  queue: PanelRecommendationDraft[], history: PanelRecommendationDraft[],
): {
  records: PanelPresentation[];
  requestViewForRecord: (record: PanelPresentation) => RequestListView;
  reviewCount: number;
  awaitingCoordinatorCount: number;
};
// New optional PanelBrowse/filter contract; absent means existing workflow grouping.
requestViewForRecord?: (record: PanelPresentation) => RequestListView;
```

- [x] Write failing fixture tests: queue id 1 SUBMITTED_TO_PANEL; history id 2 PENDING_COORDINATOR with recorded acceptance, id 3 REJECTED_BY_PANEL, id 4 CANCELLED_BY_OFFICE without a Panel decision. Include duplicate ids in input. Hand-derived expectations:

```ts
assert.equal(workspace.requestViewForRecord(accepted), 'history');
assert.equal(workspace.requestViewForRecord(unreviewed), 'requests');
assert.equal(workspace.reviewCount, 1);
assert.equal(workspace.awaitingCoordinatorCount, 1);
assert.equal(filterPanelBrowse(workspace.records, {
  view: 'history', requestViewForRecord: workspace.requestViewForRecord,
}).length, 3);
assert.equal(filterPanelBrowse([accepted], {view: 'requests'}).length, 1);
assert.equal(filterPanelBrowse([accepted], {view: 'requests', appointments: true}).length, 0);
```

- [x] Run `node --import tsx --test src/utils/panelReviewWorkspace.test.ts src/components/PanelWorkspace.test.tsx` from frontend; verify failure on missing policy/accepted-history membership.
- [x] Implement the helper by deduplicating queue/history by persisted recommendation ID, giving authenticated history membership precedence over duplicate queue entries. Count actionable queue records using existing `canActOnPanelRecord(..., 'SELECTED_PANEL')`; count awaiting Coordinator from the incoming history source only. Preserve records and factual decision evidence; do not synthesize decisions.
- [x] Add the optional request partition to `filterPanelBrowse` for requests only. Appointment lifecycle filtering stays unchanged. Wire it only to lecturer incoming requests. Outgoing recommendations, Office and Coordinator retain default workflow grouping.
- [x] Re-run those tests plus `src/utils/panelPresentation.test.ts` and `src/components/PanelReviewDecision.test.tsx`; confirm rejected/cancelled records have no repeat decision action and existing approval display remains factual.

## Task 2: Restore a single shared presentation contract

**Files:** Modify `frontend/src/components/PanelBrowse.tsx`, `LecturerPanelAppointments.tsx`, `PanelFlatBrowse.test.tsx`, `PanelWorkspace.test.tsx`; inspect `RequestWorkspacePrimitives.tsx`, `PanelAppointmentManagement.tsx`, `CoordinatorSupervisorWorkspace.tsx`.

**Consumes:** Task 1's optional data partition callback. **Produces:** one shared Panel browse layout using the existing `RequestViewSwitch`; no `flatViews` property or lecturer-only layout.

- [x] Replace tests that require absent history controls with behaviour tests for every request context (incoming review, outgoing all/student records, Coordinator, Office):

```ts
assert.match(html, /aria-label="Request views"/);
assert.match(html, />Requests/);
assert.match(html, />History/);
assert.doesNotMatch(html, /aria-label="Show"/);
assert.match(html, /Semester/);
```

  Render a populated accepted History using Task 1's callback and verify that the record is visible with Awaiting Coordinator approval and a read-only View request action. Keep tests of factual past ending date/outcome; rewrite them to exercise the shared appointment layout.
- [x] Run `node --import tsx --test src/components/PanelFlatBrowse.test.tsx src/components/PanelWorkspace.test.tsx` and verify the new presentation checks fail before changes.
- [x] Remove `flatViews` and its call-site flags. Restore the section-header Requests/History switch for request lists and Current appointments/Past appointments switch for confirmed records. Show common filters in the existing shared Panel order: search, programme, semester, status, dates, sort. Use shared styling; no new global filter framework.
- [x] Keep lifecycle start/end/outcome facts in past appointment rows independently of presentation mode, with correct Panel member identities for staff. Use context-appropriate descriptions explaining review history versus workflow outcomes. Distinguish empty current queue, empty review history and no matching filtered records.
- [x] Run all Panel renderer/filter tests and TypeScript. Check Office/Coordinator columns, exports, filter order and review authority as direct consumers, not only lecturer screenshots.

## Task 3: Add the lecturer Panel landing summary row

**Files:** Create `frontend/src/components/PanelLecturerSummaryCards.tsx` and `.test.tsx`; modify `LecturerPanelAppointments.tsx`. Reuse `AppointmentPrimitives.tsx`, `lecturerCapacity.ts`, `malaysiaDateTime.ts`; do not alter these primitives unless a demonstrated shared defect requires it.

**Interfaces:**

```ts
export function PanelLecturerSummaryCards(props: {
  workload: PanelWorkloadSummary;
  reviewCount: number;
  awaitingCoordinatorCount: number;
}): React.ReactElement;
```

- [x] Render fixtures with workloadCount=4, currentStudents=4, confirmedAppointments=2, pendingNominations=2, workloadLimit=10 and plan metadata, while the separate assignment fixture contains ended records. Assert the visible facts:

```ts
for (const text of ['Panel workload', 'Needs your review', 'Awaiting Coordinator', 'Plan v2'])
  assert.ok(html.includes(text), text);
assert.match(html, /4/); // authoritative workload, not the length of assignment history
assert.match(html, /10/);
```

  Add fixtures for NOT_CONFIGURED and TEMPORARILY_UNAVAILABLE with truthful state/availability descriptions. Assert three metric cards, actual count values and metadata; do not test arbitrary CSS strings.
- [x] Run `node --import tsx --test src/components/PanelLecturerSummaryCards.test.tsx`; verify failure before implementing the component.
- [x] Implement using three `AppointmentSummaryCard` instances in the same grid as Supervisor. Use ownPanelCapacity.workloadCount or its currentStudents fallback, never assignments.length. Explain active plus reserved nominations; retain semester, plan version, capacity state and temporary-unavailability date where supplied.
- [x] Insert above lecturer Appointment requests on Requests after successful data load, matching Supervisor placement. Feed Task 1's unfiltered incoming counts; do not count outgoing submissions or table-filtered rows. Retain the workload overview in My Panel students only if it remains useful within that separate destination.
- [x] Run card, incoming partition and Supervisor summary regressions; manually check zero, configured, unconfigured and busy/error states without creating false zero metrics.

## Task 4: Make outgoing recommendations visible and guidance relevant

**Files:** Modify `LecturerPanelAppointments.tsx`, `LecturerAppointmentGuidance.tsx`, `LecturerAppointmentConsistency.test.tsx`, `PanelSpecializedTools.test.tsx`; preserve `PanelSuperviseeRoster.tsx` and its tests.

**Consumes:** existing `submittedRecs`, `pendingPanelRequest`, `panelStudent` route and recommendation permissions. **Produces:** visible outgoing list under the roster and task-specific guidance without changing nomination workflows.

- [x] Add a renderer-level view boundary if needed to exercise the populated supervisee list without mocking the whole API. Verify Submitted recommendations is in a normal visible section, not a collapsed details element. Keep a fixture for a former supervisee and one current student with an accepted-but-unapproved outgoing nomination.
- [x] Run the affected tests and observe the closed-section check fail before changing markup.
- [x] Remove only the outer Submitted recommendations disclosure. Keep the roster above and the list visible below, including former supervisees. Preserve the student-scoped list in selected student details without duplicating all-student records there.
- [x] Add Panel guidance contexts for incoming reviews, supervisee nomination, and confirmed assignments through a typed optional context prop. Incoming review guidance explains acceptance forwards to Coordinator; supervisee guidance covers eligibility and replacement; Supervisor requests/research guidance retains its current behaviour.
- [x] Run `PanelSuperviseeRoster.test.tsx`, `PanelSpecializedTools.test.tsx`, `LecturerAppointmentConsistency.test.tsx`, `SupervisionPanelSummary.test.tsx` and lifecycle tests. Verify no new nomination button for pending requests, no automatic nomination from View panel, and no change to current/proposed member distinction.

## Task 5: Make view state and History links predictable

**Files:** Modify `PanelBrowse.tsx`, `LecturerPanelAppointments.tsx`, `LecturerAppointmentRequests.tsx`, `PanelWorkspace.test.tsx`, `LecturerAppointmentRequests.test.tsx`; extend `panelReviewWorkspace.test.ts` only for domain behaviour.

**Interfaces:**

```ts
// Add controlled view support to PanelBrowse, keeping local ListState as default.
view?: RequestListView;
onViewChange?: (view: RequestListView) => void;
// Explicit view wins; a normal local list still uses its own retained state.
const effectiveView = controlledView ?? rememberedView;
```

- [x] Reproduce saved Requests with an explicit incoming History route through the real renderer:

```ts
const memory = new Map([['PanelBrowse:lecturer-reviews:view', 'requests']]);
// Render with controlled view='history' inside the real ListState provider.
assert.match(html, /aria-pressed="true"[^>]*>History/);
assert.match(html, /Accepted applicant/);
```

  Add the reverse route case and separate outgoing/incoming state scopes. Add a Supervisor fixture where pending status is selected before switching to History; ensure a recorded final outcome becomes visible after the incompatible status is cleared.
- [x] Run affected tests and confirm failure on the existing initialHistory/memory precedence and preserved-status behaviour.
- [x] Wire the incoming lecturer view to existing reviewed/list route callbacks. Explicit reviewed routes control History; switching Requests returns to the ordinary request list. Other contexts keep local authenticated-shell state. Do not convert the whole application to one query/storage scheme.
- [x] On Supervisor lecturer view change, clear incompatible status and reset page while retaining compatible search/type/semester. Limit status options to records in the selected view. Preserve ongoing accepted requests awaiting Coordinator and existing groups; do not repurpose Supervisor History.
- [x] Re-run role navigation, recordNavigation, request/filter tests. Check incoming/outgoing state separation and record Back returns to the same source/view/filter state.

## Task 6: Repair the separately identified Student source return

**Files:** Modify `frontend/src/App.tsx`, `StudentSupervisorAppointment.tsx`, `utils/recordNavigation.test.ts`, and `StudentSupervisorApplications.test.tsx` or a focused new Student navigation test.

**Consumes:** existing validated `RecordReturn`, overview and Applications routes. **Produces:** source-appropriate record return; no new role access or record fetching.

- [x] Add table-driven return fixtures: My supervisors overview -> exact request -> overview; Applications with filters -> exact request -> same Applications state; direct record URL -> Applications fallback; malformed/external return state -> existing validated fallback.
- [x] Run the navigation/Student tests and verify the overview-return fixture fails before changing App's hardcoded Applications parent.
- [x] Select the actual allowed source parent when opening from the Student overview and supply a corresponding back label to the exact request view. Reuse the existing recordReturn validation and history-index behaviour. Do not trust arbitrary source query parameters.
- [x] Re-run Student, recordNavigation, Supervisor workspace and Section A detail regressions. Treat this as a distinct navigation correction; do not change Student Panel privacy or broaden visible history.

## Task 7: Verify the complete consumer matrix and publish review evidence

**Files:** Update `PROJECT_REQUIREMENTS.md`, `ARCHITECTURE_AND_CODING_DESIGN.md`, `PROJECT_STATUS.md`, and this plan only after each corresponding deliverable is actually verified. Do not mark the existing proposed correction complete before implementation.

- [x] Run all frontend checks from frontend with PowerShell:

```powershell
$taskTests = @(rg --files src -g '*.test.ts' -g '*.test.tsx')
node --import tsx --test --test-concurrency=4 @taskTests
npm run lint
npm run build
```

- [x] Run targeted existing backend contract suites only if backend/serializer/data-policy code changes prove necessary; select an isolated test database and include queue/history, participant lifecycle, Panel workflow/workspace and capacity assertions. Never modify the running academic demo records to manufacture a successful test.
- [x] Inspect the running browser matrix: lecturer Supervisor Requests/History/My supervisees; lecturer Panel Requests/incoming History/My supervisees/outgoing recommendations/My Panel students current/past; Coordinator both modules; Office both modules; Student both modules. Check record return, status-filter switch, empty states, narrow layout and keyboard access. Use existing development accounts only. Record which states used synthetic fixtures where live demo data was unavailable.
- [x] Review accepted -> awaiting Coordinator -> approved/rejected/Office-cancelled fixtures and cancellation-before-review. Ensure UI preserves separate decision, workflow and lifecycle facts throughout.
- [x] Request independent review with the exact task-scoped diff, spec and consumer matrix, rather than the entire dirty branch. Resolve confirmed defects before claiming completion.
- [x] Capture the corrected lecturer landing, incoming accepted History and visible outgoing recommendation section; report test/build output and remaining limitations. Leave servers available, preserve unrelated changes, and perform no commit/push.

## Self-review of this proposed plan

- All nine confirmed findings map to tasks: classification (1), presentation (2), metrics (3), outgoing visibility/guidance (4), view/filter state (5), Student return (6), coverage/evidence (7).
- The optional semantic callback differs by record meaning; no lecturer-only visual mode remains.
- Existing Supervisor final-outcome grouping, staff withdrawal visibility, Coordinator scope and Student pending identity privacy are explicit constraints.
- Implementation was authorized after this proposal. Verification results and any live-data limitations are recorded below.


## Completion evidence (2026-10-18)

All seven tasks are complete. Final full frontend run: 219 passing checks across 168 test file entries, zero failures/skips; npm run lint and npm run build exit 0. Existing ExcelJS 940 kB chunk advisory remains. All final production changes are included in this run. No backend/serializer/schema changes were necessary, so the conditional backend test step required no database run.

Incoming History was verified with existing authenticated Demo Panel Lecturer data: seven records include an accepted nomination still PENDING_COORDINATOR, rejected outcomes and a cancellation without a Panel decision. The accepted request opens read-only; Back retains History. Own workload is 4/10 from three active assignments and one reserved nomination, distinct from outgoing submissions. Cards render only on Requests. Original Demo Lecturer Supervisor roster and visible outgoing list were checked and its session restored. Coordinator, Office and Student pages in both modules were inspected; Student source return and filtered Applications retention were exercised through the browser. At 390px, actual application cards and history records wrap correctly and Enter activates History. No decision, submission or capacity mutation was performed.

Fixtures additionally cover Office cancellation after recorded acceptance, ended appointment dates/outcomes, unconfigured and unavailable capacity, deduplication, explicit route precedence, incompatible status changes and validated direct/malformed return fallbacks. These fixture states are not claimed as live mutations. Independent scoped review and re-review passed after resolving both reported gaps. Full role/evidence details and screenshot paths are in PROJECT_STATUS.md.

The temporary responsive-inspection page/tab were removed, development servers remain on ports 3001/8000, and the original lecturer session is left on Panel Appointment requests. Unrelated dirty-checkout changes were preserved. No commit, push or merge was performed.
