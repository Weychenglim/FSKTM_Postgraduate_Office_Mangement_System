# Panel Appointments consistency: approved design

Prepared 15 October 2026, Malaysia time. **Approved by the user; implemented on the current feature branch.** Final automated evidence and browser coverage limits are recorded in PROJECT_STATUS.md.

## Objective

Apply the approved Supervisor Appointments structure to Office Staff, Lecturer
(both recommending Supervisor and selected Panel), and Programme Coordinator.
The same authorised record must use the same renderer, section order, typography
and spacing. Office must open on records needing attention. Role responsibilities
and private projections remain authoritative.

This extends the handoff in
`docs/PANEL_APPOINTMENTS_CONSISTENCY_HANDOFF_2026-10-15.md`. The user's current
request explicitly includes an Office attention landing page, superseding the
handoff's instruction to discuss whether that page belongs in scope.

## Inspection findings

- Office `PanelAppointmentManagement` opens All Records, with attention in a
  sidebar. Its attention list includes confirmed, rejected and cancelled totals;
  those are record outcomes, not necessarily actionable concerns.
- Office records are loaded as an unpaged array. The backend's no-panel rows
  exclude profiles with *any* previous recommendation or appointment. That cannot
  reliably identify all currently eligible students without an active Panel.
- Lecturer/Coordinator `LecturerPanelAppointments` puts reviews, nominations and
  assignments/monitoring on one long screen. Coordinator already has a scoped
  workspace payload; it is not a server-paged browse contract.
- Review details, submitted nomination details, Office details and assigned
  student details each render their own facts and/or workflow timeline.
- `PanelAppointmentDetail.sessionFrom` invents 2025/2026 when no session is
  recorded. `PanelAssignmentDetail` infers completed review stages from an
  appointment's status. Submitted-history fallback logic can guess a rejection
  stage. The shared presentation must retain uncertainty instead.
- Office `PanelRecord`, `PanelAssignment`, `SubmittedRecommendation` and
  `PanelRecommendationDraft` have different fields. In particular Office list
  rows do not supply every nomination/replacement fact. Adapters alone cannot
  recover missing information.
- Supervisor provides `RecordPage`, request card/metadata/section/audit
  primitives, detail typography, shared table/filter/footer styles, and
  `ApprovalProcess`. Panel already uses shared decisions and appointment ending.
- `SupervisorWorkspaceNavigation` is coupled to Supervisor route helpers. Its
  styling is reusable; Panel must not masquerade as a Supervisor route.

## Recommended approach and alternatives

Use small Panel presentation models and explicit adapters, one recommendation
renderer, one appointment/lifecycle renderer, and role-specific workspace hosts.
Reuse neutral Supervisor primitives directly. Add focused read projections where
current DTOs lack authorised facts or attention queries.

Styling the existing bodies individually would be a smaller first patch but
would keep the duplication that caused the inconsistencies. Replacing all
appointment workflows with a universal module would increase risk and exceed
this request. The recommended approach shares presentation within Panel and
reuses established neutral primitives across both modules.

## Role, page and action matrix

| Role | Main navigation | Subviews and actions |
| --- | --- | --- |
| Office Staff | **Needs attention** (default), Appointment requests, Panel appointments | Attention categories below; Requests/History; Current/Past appointments. Monitor, view authorised student records, export and retain existing authorised administration/lifecycle actions. Workload is under Tools. No academic acceptance/confirmation action. |
| Programme Coordinator | **Appointment requests** (default), Panel appointments | Requests/History; Current/Past appointments, scoped to managed programmes and valid delegations. Confirm/reject only eligible nominations after selected Panel acceptance; preserve existing permitted ending controls. |
| Lecturer: selected Panel | **Appointment requests** (default), My supervisees, My Panel students | Incoming Requests/History; accept/reject only own selected nominations. My Panel students separates Current/Past assignments and retains authorised student-record navigation and own capacity context. |
| Lecturer: Supervisor | Same Lecturer workspace | My supervisees provides eligible students, nomination/replacement and submitted Requests/History. Preserve permitted cancellation, candidate eligibility, capacity, justification and replacement reason. |

History of a request describes its final decision. Past appointments describes
ended relationships. Keep those filters, status labels and empty states distinct.
Keep existing accessible guidance and tools in the relevant workspace.

## Office Needs attention

Use the Supervisor attention layout: three selectable count cards, a short
explanation, category heading/actions, visible filters, a responsive table and
pagination. Each category has a clear count unit; counts are not added together.

1. **Without Panel**: active, Panel-eligible students with current approved primary
   supervision and no active confirmed Panel. Include those with rejected,
   cancelled or ended historical workflows. Show an ongoing nomination as
   application progress; it does not establish an active appointment. Exclude
   students who are not yet eligible for nomination using existing rules.
2. **Waiting recommendations**: ongoing selected Panel/Coordinator stages, current
   reviewer, stage entry date and calendar days waiting, longest waiting first.
   Waiting age does not imply a new overdue threshold. This is a request count,
   which can overlap the student category above.
3. **Capacity concerns**: current effective semester Panel capacity problems,
   using existing capacity/availability rules and reservations. Include missing
   configuration and existing near/full/over-limit concern states. Retain
   established unavailable/capacity explanations without changing policy.

Implement role-checked read-only attention summary/browse queries. Prefer
server-side filtering/pagination for these new projections, using the existing
browse envelope and page sizes 10/25/50. Global counts and table filters must be
clearly distinguished. Existing matching-record export must cover all matching
pages when its source becomes paged. Keep legacy collection contracts compatible
for other consumers; do not silently change their array shape.

## Common page design

Module heading -> role navigation -> light Requests/History or Current/Past
switch -> list heading/actions -> visible filters -> table -> pagination.

Use existing Inter, navy/slate palette, buttons, badges and spacing tokens.
Reuse `RequestWorkspacePrimitives` and the shared browse table/filter/footer
presentation where their contracts fit; supply Panel-specific filter options.
Keep intentional horizontal table scrolling inside the table container.

An exact record opens as an independent `RecordPage`, hiding module tabs and
filters. Its content follows this order:

```text
Back to originating view
Record heading                         authorised contextual navigation
Submitted date/by                      readable request status

Request detail card
  Student, Supervisor, proposed Panel, programme and semester
  Research information
  Nomination justification / replacement facts / recorded final reason
  Approval progress
  Permitted actions
  Audit history (collapsed)

Appointment record card, when an appointment exists
  Student, appointed Panel, lifecycle status and confirmed date
  Actual ending facts/reason, when ended
  Permitted lifecycle actions
  Appointment history (collapsed)
```

No empty supporting-document section or invented upload requirement. A student
without a submitted nomination gets an honest current-context/no-Panel state.
A nomination form remains a form with no fictional submitted progress. During
replacement, show the current active Panel separately from the proposed member.

Use `appointmentDetailTypography`: section headings 16px/600, names and research
titles 14px/600, labels 12px/600, ordinary values and narrative 12px/400. Use
24px detail padding/section gaps and the established 32px desktop outer padding.
Keep abstracts and reasons readable, wrapping and preserving line breaks.
Contacts appear only where the API authorises them. Internal references remain
available to routes/API/search but are not displayed as record facts.

## Shared components and API boundaries

- Proposed `PanelRecommendationDetail` normalises common staff nomination facts
  through explicit DTO adapters. Hosts supply permitted controls and navigation.
- Proposed `PanelAppointmentRecordCard` shares available lifecycle facts between
  Office, Coordinator and assigned Lecturer. Missing historical facts stay
  missing; authorised exact projections supply available data.
- Proposed Panel approval builder returns the actual generic `ApprovalStep[]`
  contract for `ApprovalProcess`: submitted, selected Panel, Coordinator, outcome.
  Use real workflow events/timestamps, readable actors/stages and unknown states.
  Rejected/cancelled nominations mark later stages not reached. Preserve legacy
  compact history explanations and avoid repeating the final actor/date.
- Reuse `RequestDetailCard`, `RequestSection`, `RequestMetadata`,
  `RequestAuditHistory`, `RecordPage`, `AppointmentEndControl`, `DecisionDialog`
  and `completeDecision`. Extend readable audit mappings narrowly for Panel.
- Add small Panel navigation helpers/renderer using the existing navigation
  treatment. Preserve Supervisor navigation behaviour and current deep links.
- Use `ListState`/validated route return context so Back restores origin,
  filters, subview and pagination, including supervision-origin links.
- Extend existing exact staff nomination/appointment reads, or add narrowly
  authorised exact reads where missing. List context must not fabricate facts.
  Use existing Panel mutations without changing their stages or authority.

Current routes under `/panel-appointments` include records, recommendations,
submitted, reviewed, assignments and workload. Keep these links resolving; add
workspace sections through existing route helpers and deliberate aliases as
needed. Dashboard, notification, report and supervision links retain exact
record access, useful Back labels and denial/not-found behaviour.

## Permissions and decision behaviour

Authoritative Student/profile programme agreement, locked rechecks, active acting
delegations, capacity reservations, participant eligibility and replacement
continuity remain. Preserve Student's separately rendered confirmed projection;
pending identities/contact/private audit remain hidden. No evaluation scores or
comments are exposed.

Keep shared asynchronous decisions: stable immutable record identity, required
reasons/acknowledgements, retained input on ordinary failure, duplicate-submit
and busy-dismissal protection, dirty discard handling, persistent 403/409 latest
record review requirement, and saved-versus-refresh-failed distinction. Refresh
the visible record after a successful decision and emit one outcome notice.

## Verification and completion criteria

- Fixture tests cover all statuses, both rejection/cancellation actors, initial
  and replacement nominations, active/ended appointments and missing-history
  cases, including truthful no-appointment/unknown presentation.
- Attention backend tests cover active eligibility, never-nominated students,
  historical-only workflows, pending progress, active replacement continuity,
  current-semester capacity, counts/filters/paging and Office-only access.
- Re-run Panel programme/delegation, lifecycle and Student privacy regressions
  in isolated databases. No live academic decisions solely for screenshots.
- Test routes and Back/filter/page preservation, direct authorised reads,
  loading/error/Retry, dirty forms and decision failure/conflict/reload cases.
- Compare the same authorised real nomination/appointment across staff roles,
  with screenshots and computed common typography. Check desktop and 320px,
  long content, keyboard focus and dialogs. Report fixture-only coverage honestly.
- Run TypeScript, production build, relevant tests, Django checks and migration
  dry-run. Update all three root documents with actual implementation/evidence.

## Current execution state

Latest main `f54bf72` was fast-forwarded into the existing branch. Original local
work was restored, both status histories retained, and a safety stash kept.
Only main-integration/runtime preparation and this proposal are part of this
session so far. Staff Panel redesign implementation awaits design approval.
