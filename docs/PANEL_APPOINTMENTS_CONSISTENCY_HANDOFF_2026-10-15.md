# Panel Appointments: Supervisor design and consistency handoff

Prepared 15 October 2026, Malaysia time. This document is for a new session working on Lecturer, Office Staff and Programme Coordinator Panel Appointments. It records the current Supervisor design and a proposed way to apply it to Panel. **The staff Panel layout migration described below has not been implemented.**

## 1. Start here

Workspace: `C:/Users/User/Documents/FKSTM_Postgraduate_Management_System`

Current branch: `codex/portal-consistency-and-toast`. Recheck in the next session. The checkout contains extensive uncommitted work from multiple completed tasks. Inspect `git status` and relevant diffs; preserve existing changes. Do not reset, clean, switch branches, commit, push or reconstruct the module merely to obtain a clean starting point.

Read the user-provided AGENTS.md instructions and maintain the three root project documents. The current task only prepares this handoff; do the Panel implementation in the user's next session after presenting the actual inspected scope and design.

Read in this order:

1. [PROJECT_STATUS.md](C:/Users/User/Documents/FKSTM_Postgraduate_Management_System/PROJECT_STATUS.md), newest entries first: measured results and limitations.
2. [PROJECT_REQUIREMENTS.md](C:/Users/User/Documents/FKSTM_Postgraduate_Management_System/PROJECT_REQUIREMENTS.md).
3. [ARCHITECTURE_AND_CODING_DESIGN.md](C:/Users/User/Documents/FKSTM_Postgraduate_Management_System/ARCHITECTURE_AND_CODING_DESIGN.md).
4. [Supervisor handoff](C:/Users/User/Documents/FKSTM_Postgraduate_Management_System/docs/SUPERVISOR_APPOINTMENTS_HANDOFF_2026-10-13.md). Its newest sections supersede older descriptions; do not revive earlier rejected layouts.
5. [Shared Supervisor detail spec](C:/Users/User/Documents/FKSTM_Postgraduate_Management_System/docs/superpowers/specs/2026-10-14-supervisor-shared-record-details.md) and [shared decision plan](C:/Users/User/Documents/FKSTM_Postgraduate_Management_System/docs/superpowers/plans/2026-10-14-shared-decision-process.md).

Local app: `http://localhost:3001`. Local API: `http://127.0.0.1:8000`. The API was last started with `--noreload`; backend changes need a restart. Verify current processes before starting another server.

## 2. What the user means by consistency

The same record must have the same information hierarchy, section order, label wording, fonts, weights and spacing across permitted roles. Share the actual renderer and map role-specific API data into it. Having three components that happen to look similar is insufficient.

Consistency does not mean identical permissions, identical list purposes or identical amounts of private information. A primary Supervisor tracking their nomination, a selected Panel member reviewing it and a Coordinator confirming it have different responsibilities. Their common record content should still align. Office monitoring must not acquire a new academic approval action.

Specific corrections the user already insisted on:

- Do not expose internal request/appointment reference numbers, copy-reference controls or raw enums such as PENDING_SUPERVISOR, PENDING_COORDINATOR or ACTIVE in record facts/audit sentences. Keep internal IDs for API calls, routes and existing search compatibility. Student matric numbers and lecturer staff identifiers are meaningful identities, not appointment references.
- Distinguish labels, names/headings and ordinary values. Making everything bold is cluttered; making everything regular removes the hierarchy.
- Avoid cramped nested cards, repeated title/reference/submission rows, oversized status/session decorations and multiple competing timelines.
- Do not fill a historic record with repeated Not recorded actor/date lines or show completed decisions that the audit cannot establish.
- Use real, readable final outcomes in Waiting at this stage rather than a dash. Current waiting age and lifecycle status are different facts.
- Keep contacts visible where the role is authorised to see them. Keep secondary long history/admin information separate from the main facts.
- Keep navigation and review behaviour consistent, including Back, error, dirty draft, saving, success and refresh failure.
- Explain the intended scope before editing. Verify across the actual roles before claiming cross-role consistency; screenshots exposed earlier overclaims.

Readable status labels still use the established StatusBadge treatment, which may style text in uppercase. The rule concerns machine-code leakage and unreadable wording, not a blanket prohibition on that shared badge style.

## 3. Supervisor structure to carry over

### Module and list level

Module header → role-relevant main tabs → light sub-view switch where needed → list card header/actions → visible filter grid → responsive table → pagination.

Office Supervisor uses Needs attention as its landing view, then Appointment requests and Supervisory teams. Capacity reassessments is separate; secondary research/workload/configuration tools sit under Tools. This is a Supervisor-specific information architecture. **Do not automatically create an identical Office Panel attention dashboard, new tab or tool without inspecting the Panel use case and discussing the scope.**

Requests and History distinguish ongoing and completed requests. Current teams/Past appointments distinguish active and ended relationships. Do not interchange request outcome and appointment lifecycle.

Use existing shared table/filter/pagination styles. Default page size is 10, with 25/50 options where the established list supports them. Relevant filters remain directly visible; preserve filter/page context on return. No manual Refresh button; keep normal loading, Retry and the existing guarded return-to-focus reload. Supervisor Coordinator/Office browsing has server paging, but this does not prove Panel has server paging: inspect before changing loading contracts or making claims.

### Exact record level

```text
Back to the originating list/view
Record heading                         authorised contextual navigation
Submission date/by                     readable request status

Main record card
  Request summary / identities / programme / semester
  Research information and the actual requested appointment/change
  Justification / decision reason / cancellation reason, when relevant
  Existing supporting documents, if this workflow actually has them
  Approval progress
  Permitted action buttons
  Audit history (collapsed)

Appointment record card, when an appointment exists
  Student / appointed member / status / approved date
  Ending facts and reason, when ended
  Authorised lifecycle actions
  Appointment history (collapsed)
```

This is a section hierarchy, not a requirement to manufacture empty sections. Request details, approval history and appointment lifecycle remain separate concepts. A rejected or cancelled nomination must not imply an appointment was created. During replacement, distinguish the current active Panel from the proposed replacement.

`RecordPage` owns the independent record screen: hide the parent module heading/tabs/filters while it is open; retain the app sidebar and header. One labelled Back action above the heading restores the correct origin, filters and page. Do not nest RecordPage wrappers. Direct links still load the exact authorised record. Existing components named Drawer may already render RecordPage; a filename is not evidence that a literal side drawer is still needed.

Submission attribution belongs in the metadata area below the page heading, not scattered through card content. In-card entity navigation, such as View research profile or View student record, uses an aligned header action slot rather than a stray button row. Lifecycle actions belong with the appointment record.

## 4. Typography and spacing contract

Use the existing Inter family. The approved detail tokens are exported by [AppointmentPrimitives.tsx](C:/Users/User/Documents/FKSTM_Postgraduate_Management_System/frontend/src/components/AppointmentPrimitives.tsx) as `appointmentDetailTypography`:

| Purpose | Size / weight | Treatment |
| --- | --- | --- |
| Section heading | 16px / 600 | brand navy, relaxed line height |
| Person name or emphasized research title | 14px / 600 | brand navy |
| Field label | 12px / 600 | muted slate |
| Ordinary value, programme, dates, email, research narrative | 12px / 400 | dark slate, relaxed line height |
| Secondary disclosure | 14px / 600 | clear click target and keyboard focus |

Detailed outer cards use 24px padding, 32px at the established desktop breakpoint; member cards use 24px. Use 24px section/fact gaps and generous column gaps, with smaller label-to-value spacing. Adapt through existing tokens/classes rather than adding a global font override or another typography system.

The request-oriented primitives also use existing `section-label`, `card-label`, `card-value` and `card-description` classes. Inspect their effective styles: `RequestField` defaults to emphasized values, while narrative mode is regular. Do not assume every primitive automatically has the exact person-detail hierarchy above. Reuse or narrowly extend shared primitives intentionally; avoid broad descendant CSS that flattens all child weights.

Research/justification/abstract text keeps line breaks and wraps long content. Use readable prose width rather than forcing paragraphs across a huge row. Mobile fields stack and actions wrap; check at 320px. Preserve visible focus indicators without introducing a permanently outlined accordion header.

## 5. Shared building blocks already available

| File | Reuse / caution |
| --- | --- |
| [RecordPage.tsx](C:/Users/User/Documents/FKSTM_Postgraduate_Management_System/frontend/src/components/RecordPage.tsx) | Independent exact-record layout, metadata/action slots, Back/focus/scroll and dirty navigation handling. |
| [RecordDraft.ts](C:/Users/User/Documents/FKSTM_Postgraduate_Management_System/frontend/src/components/RecordDraft.ts) and [ListState.ts](C:/Users/User/Documents/FKSTM_Postgraduate_Management_System/frontend/src/components/ListState.ts) | Existing draft/busy and list-return context; preserve their scope. |
| [RequestDetailPrimitives.tsx](C:/Users/User/Documents/FKSTM_Postgraduate_Management_System/frontend/src/components/RequestDetailPrimitives.tsx) | RequestDetailCard, RequestSection, RequestField, RequestMetadata, RequestAuditHistory. Metadata accepts an old reference prop but deliberately does not render it. Readable audit labels may need Panel-specific mappings; never fall back to raw enums. |
| [SupervisorRequestDetail.tsx](C:/Users/User/Documents/FKSTM_Postgraduate_Management_System/frontend/src/components/SupervisorRequestDetail.tsx) | Example of role-specific DTO adapters feeding one shared renderer. Study the pattern; do not pass Panel data through a fake Supervisor record. |
| [SupervisorAppointmentRecordCard.tsx](C:/Users/User/Documents/FKSTM_Postgraduate_Management_System/frontend/src/components/SupervisorAppointmentRecordCard.tsx) | Example of one shared lifecycle card for Office/Coordinator payloads. Proposed Panel equivalent is not yet implemented. |
| [AppointmentPrimitives.tsx](C:/Users/User/Documents/FKSTM_Postgraduate_Management_System/frontend/src/components/AppointmentPrimitives.tsx) | Shared detail typography, detailed member/section layout, badges and guidance structure. |
| [SupervisoryTeamManagement.tsx](C:/Users/User/Documents/FKSTM_Postgraduate_Management_System/frontend/src/components/SupervisoryTeamManagement.tsx) | Shared exact-student supervision layout and SupervisionPanelSummary used by staff hosts. Do not fork its existing staff Panel summary unnecessarily. |
| [StudentResearchProfileSection.tsx](C:/Users/User/Documents/FKSTM_Postgraduate_Management_System/frontend/src/components/StudentResearchProfileSection.tsx) | Latest Student profile section used in My supervisors and Panel Appointment. Staff Panel is the next scope; this component does not grant staff access to Student APIs. |
| [ApprovalProcess.tsx](C:/Users/User/Documents/FKSTM_Postgraduate_Management_System/frontend/src/components/ApprovalProcess.tsx) and [approvalProcess.ts](C:/Users/User/Documents/FKSTM_Postgraduate_Management_System/frontend/src/utils/approvalProcess.ts) | Generic visual timeline and ApprovalStep/Event contracts. Current builder is Supervisor-specific. A Panel adapter/builder is still needed. |
| [DecisionDialog.tsx](C:/Users/User/Documents/FKSTM_Postgraduate_Management_System/frontend/src/components/DecisionDialog.tsx), [decisionSubmission.ts](C:/Users/User/Documents/FKSTM_Postgraduate_Management_System/frontend/src/utils/decisionSubmission.ts), [DecisionFeedback.tsx](C:/Users/User/Documents/FKSTM_Postgraduate_Management_System/frontend/src/components/DecisionFeedback.tsx) | Already adopted by Panel review/cancellation/ending. Preserve the common asynchronous contract. |
| [AppointmentEndControl.tsx](C:/Users/User/Documents/FKSTM_Postgraduate_Management_System/frontend/src/components/AppointmentEndControl.tsx) | Shared user confirmation with required outcome/reason, already used for Panel ending. |
| [RequestWorkspacePrimitives.tsx](C:/Users/User/Documents/FKSTM_Postgraduate_Management_System/frontend/src/components/RequestWorkspacePrimitives.tsx) | Existing table, view switch and filters. Contains an old reference helper: availability is not permission to reintroduce visible references. |
| [recordNavigation.ts](C:/Users/User/Documents/FKSTM_Postgraduate_Management_System/frontend/src/utils/recordNavigation.ts) and [routes.ts](C:/Users/User/Documents/FKSTM_Postgraduate_Management_System/frontend/src/constants/routes.ts) | Validated return context and route helpers. Preserve supervision → Panel detail/replacement → supervision return paths. |

Supervisor-specific document download components use Supervisor API identifiers; do not reuse them for Panel without verifying that the backend document contract is the same. Do not invent a Panel upload requirement.

## 6. Approval progress versus audit

Keep both, with different jobs: Approval progress is the concise visible roadmap; Audit history is the collapsed event record. Appointment history is separate lifecycle audit. Avoid repeating the same prose, actor and date at every layer.

Panel's actual sequence remains Supervisor nomination → selected Panel acceptance → programme Coordinator confirmation → confirmed appointment. Research changes finishing at Supervisor approval is a different workflow; do not copy that shortened sequence into Panel.

Build Panel `ApprovalStep[]` from actual workflow events/timestamps and status. Support completed, current, upcoming, rejected, cancelled, not_reached and unknown. The existing renderer uses step IDs `submitted` and `outcome` for its terminal/legacy presentation, so a new Panel adapter must honour that contract. Do not cast Panel statuses into the Supervisor builder or feed its old active/pending step vocabulary directly into the shared renderer.

For rejected/cancelled records, later stages are not reached. When audit details are unavailable, use the shared compact historical explanation rather than guessing the reviewing actor/date or displaying four completed stages with missing details. Avoid repeating the final review actor/time at Outcome. Use shared Malaysia date formatting; date-only records must not acquire a fictional time.

## 7. Decision behaviour that must survive the layout migration

- Reviewer approval/rejection uses `kind="review"`; cancellation and appointment ending use `kind="confirmation"`. The latter is the acting user's confirmation, not another approving party.
- Dialog identifies the Student and consequence, uses an explicit action label, and retains each API's existing reason/acknowledgement rules.
- Callback awaits the save, propagates save errors, does not close early and does not emit a competing success toast.
- `completeDecision(save, strictReload)` distinguishes a failed save from a committed save whose GET failed. Report the latter as saved with a reload warning; do not encourage resubmitting the mutation.
- Keep the dialog and its controller in a stable host. Its immutable record key must not change with action/status. Preserve same-record 403/409 blocking across close/reopen until successful explicit latest-record review.
- Block duplicate submit and dismissal while saving; ordinary failure retains typed input. Back/Escape/backdrop with dirty input uses the existing in-dialog discard interaction.
- Keep the record visible after success with refreshed state/progress/history and one outcome toast. Do not restore obsolete actions after the returned record becomes read-only.
- Ordinary nomination/edit/draft forms remain forms; do not add an extra confirmation/approval stage to every keystroke or save.

## 8. Panel inventory to inspect in the next session

The following differences are present in source, rather than a claim that staff Panel is already consistent:

| Entry point / role | Current source | Work to inspect |
| --- | --- | --- |
| Selected Panel review and Coordinator confirmation/tracking | [LecturerPanelAppointments.tsx](C:/Users/User/Documents/FKSTM_Postgraduate_Management_System/frontend/src/components/LecturerPanelAppointments.tsx), especially PanelRecommendationReviewDrawer | Uses RecordPage and shared decisions, but a bespoke recommendation body and PanelRecommendationProgressTimeline. Inspect all modes, not only the action queue. |
| Supervisor submitted nomination/history details | [RecommendationDetailsDrawer.tsx](C:/Users/User/Documents/FKSTM_Postgraduate_Management_System/frontend/src/components/RecommendationDetailsDrawer.tsx), [SubmittedRecommendationsPage.tsx](C:/Users/User/Documents/FKSTM_Postgraduate_Management_System/frontend/src/components/SubmittedRecommendationsPage.tsx) | Another body, buildTimeline/TimelineMarker and WorkflowAuditLog. Despite its name, the detail component renders RecordPage. |
| Office record monitoring/details | [PanelAppointmentManagement.tsx](C:/Users/User/Documents/FKSTM_Postgraduate_Management_System/frontend/src/components/PanelAppointmentManagement.tsx), [PanelAppointmentDetail.tsx](C:/Users/User/Documents/FKSTM_Postgraduate_Management_System/frontend/src/components/PanelAppointmentDetail.tsx) | Separate columns/cards, session treatment, buildWorkflowItems/PanelWorkflowTimeline and audit. Inspect source defaults instead of retaining invented session fallbacks. |
| Lecturer assigned Panel students/detail | [PanelAssignmentDetail.tsx](C:/Users/User/Documents/FKSTM_Postgraduate_Management_System/frontend/src/components/PanelAssignmentDetail.tsx), hosted by LecturerPanelAppointments | Inspect overlap with Office exact appointment information, lifecycle state and allowed student-record navigation. |
| Supervisor initial nomination/replacement form | [RecommendPanelMemberDrawer.tsx](C:/Users/User/Documents/FKSTM_Postgraduate_Management_System/frontend/src/components/RecommendPanelMemberDrawer.tsx) | Already uses RecordPage. Preserve candidates, capacity, eligibility, required justification/replacement reason, dirty draft and return context. Apply shared structure only where appropriate. |
| Workload and other lists | [PanelWorkloadMonitoring.tsx](C:/Users/User/Documents/FKSTM_Postgraduate_Management_System/frontend/src/components/PanelWorkloadMonitoring.tsx), management/lecturer hosts | Audit typography, filters, mobile tables, waiting/status and navigation separately. These are not recommendation detail pages. |
| Student Panel | [StudentPanelAppointment.tsx](C:/Users/User/Documents/FKSTM_Postgraduate_Management_System/frontend/src/components/StudentPanelAppointment.tsx) | Just updated and verified. Preserve its private/public projection; do not replace it with the staff detail renderer. |

Trace routing in [App.tsx](C:/Users/User/Documents/FKSTM_Postgraduate_Management_System/frontend/src/App.tsx). Relevant route families are /panel-appointments, /records/:recordId, /recommendations/:recommendationId, /submitted, /reviewed, /assignments/:studentId and /workload, under that root. The recommendation form can start through the existing student query/route helper. Inventory every permitted list/detail/form mode and entry path, including dashboard, notification, report and supervision links.

Backend namespace is /api/appointments/panel/. Read [urls.py](C:/Users/User/Documents/FKSTM_Postgraduate_Management_System/backend/appointments/urls.py), [views.py](C:/Users/User/Documents/FKSTM_Postgraduate_Management_System/backend/appointments/views.py), [serializers.py](C:/Users/User/Documents/FKSTM_Postgraduate_Management_System/backend/appointments/serializers.py), [panel_access.py](C:/Users/User/Documents/FKSTM_Postgraduate_Management_System/backend/appointments/panel_access.py) and the mappings in [appointmentsApi.ts](C:/Users/User/Documents/FKSTM_Postgraduate_Management_System/frontend/src/services/appointmentsApi.ts). Lists and exact endpoints use different DTOs; sharing an API namespace does not guarantee equivalent data or permission.

Known endpoints include the root records list, workload/, my-workload/, eligible-supervisees/, candidates/, student/, recommendations/, recommendations/:id/, review-queue/, coordinator-queue/, coordinator-workspace/, review-history/ and assignments/. Mutations include panel-accept, panel-reject, coordinator-approve, coordinator-reject, cancel and appointments/:id/end. Use the existing paths and backend capabilities; do not invent a universal approval endpoint.

## 9. Role, privacy and business boundaries

| Role/context | Preserve |
| --- | --- |
| Primary Supervisor | Recommend/replace for eligible supervisees and track their nominations; cancellation only where current backend permits it. |
| Selected Panel Lecturer | Accept/reject only the recommendation assigned to them; see their own confirmed assignments. |
| Programme Coordinator | Programme-scoped confirmation/rejection and authorised lifecycle controls. No new research approval responsibility. |
| Office Staff | Faculty monitoring, records/workload and existing authorised administration/lifecycle controls. Do not add Panel academic approval authority. |
| Student | Own current saved research and confirmed Panel. Pending member identities/contact, internal reviewer stages and staff-private audit remain hidden. |

Coordinator Panel decision/capability/queue and closure guards were recently fixed: authoritative linked Student programme must agree with the research profile programme. Mismatched/unlinked legacy data must not grant Coordinator decisions. Existing valid active official acting delegations remain intentional exceptions. Recheck under workflow locks; a frontend-hidden button is not authorization. Preserve read-only legacy monitoring and assigned/Office audit access where currently permitted.

No silent changes to capacity policy, appointment limits, lifecycle eligibility, reserved Panel workload, replacement continuity, document requirements, evaluation-task lifecycle or approval stages. No evaluation scores/comments in Student views. If an API projection lacks a needed common field, determine whether it is actually available and authorised before adding it; do not fill it from arbitrary list context or invent a value.

## 10. Suggested next-session approach (proposal)

1. Inventory the routes/components/API projections above and build a role × page × action matrix. Identify the same recommendation/appointment through every permitted role, not just the same URL.
2. Show the user the concrete scope and a simple record wireframe. Keep Supervisor's hierarchy while retaining Panel's actual fields and responsibilities.
3. Introduce a small Panel presentation model and adapters for the actual DTOs. Reuse one recommendation renderer and one appointment/lifecycle renderer across the staff contexts that share content. These proposed abstractions do not exist yet.
4. Add a Panel approval-step builder using the common visual contract; reconcile duplicate timeline/audit renderers after preserving every meaningful recorded state. Do not delete exported timeline helpers blindly: existing tests/consumers may depend on them.
5. Migrate all hosts, including read-only/history/assignment/Office variants, not only the approval form. Preserve existing shared DecisionDialog integration and strict reload behaviour.
6. Apply shared list/filter/table typography where the inventory identifies inconsistencies. Keep specialized workload and nomination forms purposeful; do not turn every page into a giant all-purpose card.
7. Verify the same real record in Lecturer/Supervisor, selected Panel, Coordinator and Office where each is authorised. Compare computed common text styles and section order, capture previews, then check 320px. Record actual limits rather than claiming every role was live-tested.

Do not create live approvals, rejections, cancellations or appointment endings just to obtain a screenshot. Use isolated fixtures for mutation scenarios unless the user explicitly authorises a named disposable test workflow.

## 11. Acceptance and verification checklist

- Shared staff recommendation content has matching section order/typography/spacing for the same authorised record; role-specific actions and private fields remain correct.
- Shared appointment facts and lifecycle/audit presentation match across Office, Coordinator and Lecturer where available.
- Initial/replacement, pending selected Panel, pending Coordinator, approved, both rejection stages, both cancellation actors, active/ended/replaced appointments and legacy missing-history records render truthfully.
- Names/headings, labels and narrative are visibly distinct. No visible internal appointment references, copy controls, raw enums or fictional dates/actors.
- One concise progress timeline; audit stays separately collapsed. Programme scope/delegation and pending Student privacy are unchanged.
- Existing decision error/input/pending/duplicate/conflict/reload behaviour remains. Saved-but-refresh-failed is not shown as a failed save.
- Back restores queue/history/filter/page and supervision-origin context. Direct links, missing IDs, access denial, loading/error/Retry and no-profile states work.
- Desktop and 320px layouts fit; long programme/name/email/abstract/reason content wraps. Keyboard focus and dialog dismissal remain usable.
- Requirements/design/status docs are updated with current evidence. No completion claim based only on a shared component existing or on one role's screenshot.

Relevant frontend tests already include SupervisorDetailFeedback, SupervisorRequestDetail, RequestDetailPrimitives, SupervisionPanelSummary, SupervisoryTeamRoutes, RecordPage, RecordPageMigrations, PanelReviewDecision, PanelCandidateSelection, DecisionHostContract, decisionSubmission, approvalProcess and the panelRecommendationWorkflow/Records/History utilities. Some are source/rendering contracts rather than browser behaviour tests; distinguish that evidence. Add meaningful Panel presentation/state regressions instead of merely changing snapshots to accept a new shape.

Backend regression anchors: appointments.tests, appointments.test_panel_programme_guard, appointments.test_student_team_panel_privacy, appointments.test_supervision_panel_detail, appointments.test_appointment_lifecycle and appointments.test_coordinator_delegation. Use isolated test databases; do not run a destructive seed command over the current user data.

Latest completed Student profile change: 140 frontend test scripts, 46 scoped Panel workflow/privacy backend tests, TypeScript, production build, Django checks and migration dry-run passed. This is a baseline, **not verification of the future staff Panel redesign**. Earlier shared decision work separately passed 100 scoped backend tests. Run appropriate fresh checks after changes; do not add these test totals together as a new suite result.

Runtime paths when tools are not on PATH:

- Node: `C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe` (run frontend commands from the frontend directory).
- Python: `C:/Users/User/Documents/FKSTM_Postgraduate_Management_System/.venv/Scripts/python.exe` (run Django commands from backend).
- Frontend tests use Node with `--import tsx --test`; TypeScript uses node_modules/typescript/bin/tsc --noEmit; production build uses node_modules/vite/bin/vite.js build.

## 12. Evidence and test accounts

These are local screenshot artifacts; they may be unavailable on another machine. If missing, inspect the current app rather than treating a missing screenshot as a blocker.

- Current Student shared profile: `C:/Users/User/AppData/Local/Temp/student-research-profile-supervision-2026-10-15.png` and `C:/Users/User/AppData/Local/Temp/student-research-profile-panel-2026-10-15.png`; matching mobile files insert -mobile before the date.
- Approved cross-role supervision hierarchy: `C:/Users/User/AppData/Local/Temp/supervision-hierarchy-lecturer-2026-10-14.png`, corresponding -coordinator, -office and -student files.
- Shared dialogs: `C:/Users/User/AppData/Local/Temp/shared-decision-approval-2026-10-15.png`, -rejection, -rejection-mobile and -office-confirmation variants. These were previews without academic mutations.

15 fresh local test accounts exist across DS/CS/AI: two Students, two dual Supervisor/Panel Lecturers and one Coordinator per programme. IDs use TEST-DS-STU-01/02, TEST-DS-LECT-01/02, TEST-DS-COORD-01, with CS/AI equivalents. Credentials are only in the ignored local `C:/Users/User/Documents/FKSTM_Postgraduate_Management_System/backend/.env.cross-programme-test-accounts-2026-10-15.md`. Do not copy passwords into this handoff, code, tracked docs or tool logs. The six new Lecturers still need Office semester capacity configuration/publication before appointments; account creation did not alter the published plan. Existing demo accounts/academic records were preserved.

## 13. Prompt to paste into the next session

> Read docs/PANEL_APPOINTMENTS_CONSISTENCY_HANDOFF_2026-10-15.md and the newest root project documentation on the current codex/portal-consistency-and-toast branch. I want Panel Appointments for Lecturer (Supervisor and selected Panel), Office Staff and Programme Coordinator to use the approved Supervisor structure, typography, spacing, shared record layout, approval progress/audit separation and decision behaviour. Inspect every permitted Panel list/detail/history/assignment/form route and its API projection first. Tell me the concrete scope and design before editing. Reuse the shared components and preserve programme authorization, acting delegations, capacity, replacement continuity and Student pending-Panel privacy. Preserve the dirty branch. Do not claim cross-role consistency until the same authorised record has been checked across the relevant roles and at mobile width.
