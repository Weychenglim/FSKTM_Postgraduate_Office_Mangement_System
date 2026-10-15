# Supervisor shared record details

Approved in conversation: “make a final big roast, then start implementing”.

## Scope

Standardize primary/replacement appointment request details across Student, Lecturer, Coordinator and Office; supporting request details for authorized staff; research/transfer request details and historical comparisons; team and ended-record presentation. Align profile/revision and form framing where appropriate. Existing list/filter/export and staff-tool purposes remain; Capacity reassessments keeps its existing placement/rules. Panel recommendations remain unchanged while neutral components are ready for later reuse.

## Presentation

RecordPage metadata sits beneath the page heading and outside content cards: actual known submitter, submitted date in Malaysia, current status. References and Copy reference are omitted following user correction; identifiers remain internal. Main card order: summary, requested information/changed fields, documents, approval progress, permitted decisions/cancellation, collapsed audit when actual events exist. View research profile sits in the summary header at the upper right inside the card. Important rejection/cancellation reasons stay visible. Research comparisons retain immutable Original/Requested snapshots, changed fields only, without Not applied or implementation boilerplate. Attribute to the actual submitter, not automatically Student.

Use one typography hierarchy: consistent headings/labels, emphasized summary facts and regular-weight research narrative across primary and change cards. Missing detailed historical evidence uses one concise explanation rather than repeated unknown actor/time placeholders. Translate audit actions/statuses into readable labels. Use one appointment-record renderer for normalized role data and one exact-student supervision layout for Office, Coordinator and Lecturer; differences belong only to authorized actions/data, not duplicate role-specific layouts.

Progress is a vertical accessible list, showing completed/current/upcoming/rejected/cancelled/not-reached/unknown states. Use persisted workflow status and recorded events. No fabricated actor or time, no invented completion from the position of an event. New research ends at Supervisor; primary/supporting appointments retain Coordinator approval; transfers retain source/destination Coordinator. Historical research Coordinator decisions remain recognizable. Missing audit data does not erase a known current status; unknown historic details explicitly remain unrecorded.

Same page structure does not grant same access: preserve API scope, Student nomination visibility limits, server action capabilities, participant/capacity guards, exact identity, drafts, audit order, documents and originating return context. Approval and appointment lifecycle are distinct.

## Shared contracts

- `ApprovalEvent`: id, action, actorName, optional actorRole/previousStatus/reason/retainTeam, newStatus, createdAt.
- `buildSupervisorApprovalProcess({kind,status,submittedAt,events,waitingDays,waitingOn})`: kind primary/supporting/research/transfer, returns explicit ApprovalStep array.
- `ApprovalProcess({steps,title?})`: generic visual list, no permission or workflow fetching.
- `RequestAuditHistory({events,title?})`: collapsed accessible event disclosure with Malaysia timestamps and recorded transitions.
- `RequestMetadata({submittedAt?,submittedBy?,statusLabel?,statusTone?})`: compact header metadata; legacy reference prop is ignored.
- `RequestDetailCard({children,progress?,actions?,audit?})` and `RequestSection({title,description?,actions?,children})`: consistent section/slot layout.
- `RequestField({label,value?,narrative?})` and shared narrative class: consistent summary and long-text typography.
- `SupervisorAppointmentRecordCard`: shared primary appointment facts, permitted ending control and recorded lifecycle history.
- `SupervisoryStudentDetailCard`: shared exact-student team/research/activity layout with caller-owned authorized actions.
- `RecordPage.metadata?: ReactNode`: metadata header slot; existing navigation and draft behavior unchanged.
- `SupervisorRequestDetail({request,actions?,administration?})`: normalized primary request presentation, documents and process, no mutation permissions inside renderer.
- `RequestedChangesComparison`: research/profile snapshot presentation; profile correction is a revision, not an approval.

No new dependencies, schema changes or automatic academic decisions. Work remains on the requested dirty branch; preserve previous changes and do not commit/push.

## Reviewed page and API inventory

All routes below are relative to `/api/appointments/`. Same record identity can have different role-scoped projections; sharing presentation does not merge authorization.

| Page family | Existing API/projection | Final treatment |
| --- | --- | --- |
| Primary/replacement request | `supervisor/applications/:id/`; staff `office-workspace/requests/primary/:id/` / `coordinator-workspace/requests/primary/:id/` | Shared primary summary, submitted research, documents, progress, caller actions and audit; metadata below heading. |
| Supporting request | `co-supervisor/` nominations for Lecturer; staff `*-workspace/requests/supporting/:id/` | Shared supporting card, factual progress and audit; pending nominations remain unavailable to Student. |
| Research/transfer request | `research-amendments/:id/` | Same detail structure across authorized roles, actual request-kind heading, immutable comparison and upper-right profile navigation. Existing decision/cancel capability retained. |
| Research profile/revisions | `research-amendments/options/` and collection projections | Shared before/after revision comparison; corrections/baseline are records, not approval workflows. |
| Current supervision/team | `co-supervisor/`, `co-supervisor/students/:id/`, staff `*-workspace/teams/:identity/`; Lecturer `supervisor/supervisees/` | Shared staff team cards and audit remain; current relationships, appointment activity and semester milestones retain distinct meaning. Student sees their authorized confirmed team only. |
| Past primary appointments | Staff appointment browsing plus exact primary application/lifecycle projection | Shared record sections, actual end dates/outcomes and separate lifecycle audit/controls. |
| Past supporting appointments | Staff `*-workspace/appointments/supporting/:id/`; Lecturer workspace history | Exact historical record metadata, summary, end outcome and collapsed authorized audit. Embedded team/history summaries remain compact. |
| New/replacement primary form | `supervisor/candidates/`, active document requirements and `supervisor/applications/` | Existing dedicated RecordPage, draft/capacity/participant/document validation retained; form is not a submitted request. |
| Supporting nomination/replacement form | `co-supervisor/students/:id/candidates/`, nominations mutation | Existing guarded form retained; no fictional timeline before submission. |
| Research/correction/transfer form | amendment options, collection and corrections mutations | Existing guarded form and permissions retained; same immutable comparison reused after recording. |
| Needs attention and paged request/team/history lists | Staff `*-workspace/*`, Office attention/summary | Existing purpose-specific lists, filters, paging, exports and return context retained. |
| Capacity, workload and document requirements | capacity-reassessments, supervisor workload/requirements APIs | Existing specialized tools retained; placement/policy unchanged. |

Mutation endpoints, document download routes and role scoping remain unchanged. Panel routes and UI are outside this implementation; neutral presentation primitives can be adopted later with a Panel-specific adapter.
