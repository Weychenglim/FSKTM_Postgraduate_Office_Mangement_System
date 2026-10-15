# Supervisor Appointments handoff

## Next-session Panel consistency handoff (15 October 2026)

For applying the approved Supervisor structure/design to Lecturer, Office Staff and Coordinator Panel Appointments, start with [PANEL_APPOINTMENTS_CONSISTENCY_HANDOFF_2026-10-15.md](C:/Users/User/Documents/FKSTM_Postgraduate_Management_System/docs/PANEL_APPOINTMENTS_CONSISTENCY_HANDOFF_2026-10-15.md). It inventories the remaining Panel renderers, shared components, role/privacy boundaries, typography and verification criteria, and includes a next-session prompt. This is documentation for future work; the staff Panel detail/timeline migration is not implemented by preparing the handoff.

## Student research profile presentation (15 October 2026)

My supervisors and Panel Appointment now reuse StudentResearchProfileSection: visible current title, Programme/Research area row and readable abstract with the existing typography hierarchy. This replaces the earlier grey nested Student disclosure; staff profile disclosures are unchanged. The authenticated Student Panel endpoint adds nullable researchProfile (title/programme/area/abstract) from the current saved profile and retains researchTitle for compatibility. No saved profile means null; pending Panel identities remain private. Validation and screenshot evidence are recorded in the newest PROJECT_STATUS.md entry.

## Shared decision process integration (15 October 2026)

Supervisor, supporting, research/transfer and Panel review/cancellation/ending now use the same `DecisionDialog` process as final user confirmations in Marks, Timeline and Workflow. Reviewer approval remains distinct from the authorised user's own action confirmation. Reasons, transfer/team acknowledgements, expected status/version, Student privacy and existing reviewers are retained. Research decisions remain final with the primary Supervisor; stale guidance was corrected. Errors remain inside the dialog, 403/409 require explicit latest-record review, and saved-but-reload-failed operations report a warning without encouraging duplicate save. Shared feedback survives a saved record host changing; Office Marks blocks further changes until latest data reloads.

Coordinator Panel decisions and closure now validate authoritative linked Student/profile programme agreement, including under workflow locks. Active official acting delegations remain. Mismatched/unlinked records no longer grant decisions; Office/assigned audit and legacy monitoring are retained. The previous inspection's programme mismatch is fixed. Plan and task/review reports are under docs/superpowers/plans/2026-10-14-shared-decision-process.md and adjacent decision reports. Root status contains current test and live evidence; no academic decisions were submitted during browser QA.

## Approved hierarchy and live role comparison (2026-10-14)

The user rejected flattened label/value weights and explicitly approved a clearer hierarchy. Labels are now muted 12px semibold, names 14px semibold, section headings 16px semibold, disclosures 14px semibold and ordinary values/narrative 12px regular. Shared Lecturer/Coordinator/Office supervision and Student My supervisors use these styles. Live same-student staff checks found zero font/size/weight/colour/line-height mismatches; expanded Office/Coordinator profiles also match. Student overview checked separately with own content. All 133 frontend scripts, TypeScript and build pass. Previews are C:/Users/User/AppData/Local/Temp/supervision-hierarchy-{lecturer,coordinator,office,student}-2026-10-14.png. Earlier compact/flattened previews are superseded. Existing actions and privacy are preserved.

## Supervision detail visual correction (2026-10-14)

The compact Panel/context layout was rejected after implementation. Shared staff supervision cards now use matching semibold Supervisor/Panel names, regular factual/narrative text, medium labels, larger padding and grouped disclosure spacing. Panel/member actions and backend-derived permissions are retained. The appointment-record card follows the same lighter hierarchy. All 133 frontend scripts, TypeScript and build pass; live Lecturer computed styles and a 320px overflow check verified the correction. Updated preview: C:/Users/User/AppData/Local/Temp/supervision-spacing-weight-corrected-2026-10-14.png. Earlier screenshots are superseded for this layout.

Prepared 13 October 2026 for a new development session. This is a continuation guide for the existing implementation, not a proposal to rebuild it. Paths below are repository-relative.

Earlier navigation update (13 October 2026): Coordinator Research changes is now an interim Programme transfers tab with transfer-only Requests/History. Office has two main tabs and a secondary Research records tool retaining monitoring, history, profiles, corrections and transfer initiation. Student/Lecturer tabs and capacity remain. Registry transfer relocation remains deferred; the subsequent Office attention update below implements the approved landing page. The stale new-research subtitle noted below has been corrected. See the newest entries in the three root project documents.

Office attention update (13 October 2026): Office now opens Needs attention at the module root, with Appointment requests at /supervisor-appointments/requests and the existing Supervisory teams route. Three paged categories identify students without an active primary supervisor, waiting requests and workload concerns. More tools replaces Records administration and retains Research records, workload, requirements and full exports. Capacity reassessments remains separate. New Office attention read endpoints and matching-record CSV exports are documented in the latest root entries. Registry transfer relocation remains deferred.

Shared detail update (14 October 2026): Primary request details across all four roles, authorized supporting requests and research/transfer details now share metadata below the heading, consistent content sections, factual approval progress and collapsed audit. Requested changes retain before/requested snapshots and actual submission attribution. Historical research review is marked as belonging to the earlier process; current research ends at Supervisor review. Appointment lifecycle dates/end outcomes remain separate. All module page families and API namespaces were reviewed; see the inventory in `docs/superpowers/specs/2026-10-14-supervisor-shared-record-details.md`. Lists/forms/tools keep their distinct purposes; Panel adoption remains later work. Manual Refresh was removed in the earlier owned-module controls update.

## 1. Start here: workspace and source of truth

Latest staff supervision update (14 October): View student record sits in the identity header; Student email is visible with the facts. Exact staff team responses provide current Panel/contact details and pending nomination/replacement state. The shared Panel section shows confirmed membership, permitted View details/Replace actions, and pending-stage links without duplicate recommendations. Pending replacements retain the current member. Lecturer detail fetches exact team context after resolving the authorized roster identity; roster and Student privacy projections remain unchanged. Panel detail/replacement-form Back actions return to originating supervision details. Root status records scoped tests and live evidence; no live nominations were submitted.

Latest visual correction (14 October): the initial shared-detail completion overstated consistency and is superseded. No visible request/appointment reference or copy control remains in detail headers/cards. Audit uses readable labels, empty audit is hidden and legacy missing history has one concise explanation. Original/Requested comparisons have no Not applied filler. Office/Coordinator/Lecturer exact-student supervision uses the same student and appointment components; authorized controls/contact/audit data may differ. Primary and change narratives share regular-weight typography, and View research profile is in the upper-right summary header inside the card (wraps on mobile). The Lecturer Active DTO is normalized before rendering and must match the current primary appointment identity. Updated spec and root status record current validation.

- Repository: `C:/Users/User/Documents/FKSTM_Postgraduate_Management_System`.
- Current branch: `codex/portal-consistency-and-toast`.
- Current HEAD at preparation: `93049a242259ca6b7256d4caf53318b8743fa491` (`Merge pull request #17 from Weychenglim/Xiang`). The branch was fast-forwarded to main and local work restored afterward.
- The working tree has substantial modified and untracked files. Coordinator/Office paging, withdrawal visibility, manual course codes and the latest research approval changes include uncommitted work. Preserve both tracked changes and new files; do not reset, clean, overwrite, or infer that HEAD contains all work described here.
- Inspect `git status`, `git diff` and the actual files again before editing. Other sessions can change this shared checkout. No new commit or push is made by this handoff.
- Read `PROJECT_REQUIREMENTS.md`, `ARCHITECTURE_AND_CODING_DESIGN.md`, and `PROJECT_STATUS.md` first, then the relevant source. Maintain these three documents while implementing changes.
- Newer dated requirements supersede older descriptions. The root documents retain historical decisions that are no longer current; see the explicit supersession notes below.
- Portal development URL: `http://localhost:3001`; API: `http://127.0.0.1:8000`. The latest status entry records both servers running, but check them again. Port 3000 can belong to another application.

## 2. Agreed layout and navigation

The same hierarchy is used across the four academic roles, with role-specific labels and capabilities:

| Role | First section | Second section | Third section |
| --- | --- | --- | --- |
| Student | My supervisors | Applications | Research changes |
| Lecturer | Appointment requests | My supervisees | Research changes |
| Programme Coordinator | Appointment requests | Supervisory teams | Programme transfers (interim) |
| Office Staff/Admin | Needs attention | Appointment requests | Supervisory teams |

List pages have the module heading, role navigation, relevant summaries, section heading, filters, a responsive table and pagination. Requests/History belongs with its section heading. Manual Refresh controls have been removed; mutation reloads, Retry and guarded return-to-focus loads remain. Avoid adding unrelated tools or selectors to the card's upper-right corner.

Substantial details, reviews and forms use an independent `RecordPage` in the main content area. On that screen the originating module heading, tabs, summaries and filters are hidden. One labelled Back action sits above the record heading. There are no breadcrumbs and no Back button squeezed above/below a visible tab bar. The sidebar/top application shell remains. This is the final navigation decision; earlier chat proposals that kept tabs visible or used breadcrumb returns were superseded.

- Review request and View request share the detail layout; actions depend on server-authorized capabilities.
- View supervision opens the supervision detail page.
- Back restores the originating view, filters and pagination. Direct notification/report/dashboard links still resolve the exact authorized record with an appropriate fallback return.
- Brief confirmations/previews use the shared modal. Small contextual controls can remain inline. The system does not force every interaction into one UI container.
- Dirty drafts require discard confirmation; saving blocks navigation. Successful mutations can return without a stale discard warning. Failed submissions retain the draft.
- Office Back navigation no longer triggers a success toast. Actual operation outcomes still receive feedback.

Implementation: `RecordPage.tsx`, `RecordDraft.ts`, `ListState.ts`, `utils/recordNavigation.ts`, `App.tsx`, and the existing shared PageHeader/modal components. ListState is scoped to the authenticated layout and does not persist credentials, record data or form drafts.

Related design documents:

- `docs/superpowers/specs/2026-10-11-record-navigation-design.md`
- `docs/superpowers/specs/2026-10-11-global-navigation-audit.md`
- `docs/superpowers/specs/2026-10-12-supervisor-role-hierarchy.md`

## 3. Tables, filters and wording

- Use the established portal typography and `data-table`, `data-th`, `data-td`, `data-td-strong` styles. Do not introduce a different table font, heading casing or weight system.
- Request tables separate Student, Request type, Submitted, Current stage, Waiting at this stage and Action. Staff projections add relevant programme information where needed.
- Waiting is calendar days at the current stage, separate from the stage label. Terminal outcomes show Completed/Cancelled/Rejected or the corresponding final lifecycle label; unavailable timing is Not recorded. Dates/ages use Malaysia calendar conventions.
- Long programme names and research content belong in details rather than crowding Lecturer rows. Internal references may remain searchable, but are not displayed or copied in exact detail headers/cards.
- Narrow screens use labelled stacked records; wide screens use tables.
- Page sizes are 10/25/50, default 10. Changing filters/page size resets the page appropriately. Return restores context.
- Coordinator and Office routine request/research/team browsing is server-filtered and paged. Lecturer/Student paths retain their existing loading/paging contracts; do not claim the entire module has server pagination.
- Coordinator/Office share the responsive filter grid. Relevant status/date fields are visible directly; no More filters expander. Clear filters occupies an aligned action row at the lower right.
- Current teams/Past appointments is a light switch outside the card, below module navigation. Current teams always groups by supervisor. No By supervisor/By student dropdown remains in the final design.
- Student search finds matching supervisor groups, and the selected search/scope carries into View students. Relationship counts represent scoped primary/supporting student relationships, not total lecturer capacity.
- Past appointments means ended/replaced appointments. Request History means completed request outcomes. Keep these concepts and labels distinct.

Historical notes about All ongoing toggles for Coordinator, By student options, Appointment history labels, summary-card record lists, drawer reviews or Back under tabs are superseded by the final behavior above.

## 4. Changes and responsibilities by role

### Student

- My supervisors shows the active primary/supporting team and factual confirmed former supporting appointments.
- Supporting nominations, candidate justifications, staff rejection reasons and pending nomination workflow are not Student-facing. Applications History contains Student-submitted primary applications, not staff nomination history.
- Student notifications announce confirmed supporting appointments and factual appointment endings, linking to My supervisors. Nomination notices are staff-only; old Student nomination notices are excluded and legacy appointment notice bodies sanitized.
- Applications separates ongoing requests and completed history, uses consistent record tables and opens exact application details.
- Research changes has independent Requests/History. Its current profile summary gives the title priority; actions align beside it on wide screens and below on smaller screens. Pending-submission restrictions remain.
- The optional Course code(s) field is manual free text, maximum 255 characters, trimmed. It persists through the existing multipart application API, prefills editable replacements, participates in dirty-draft protection and appears in exact views for all permitted roles. Historical values stay blank/Not recorded. No programme mapping, course allowlist or extra upload requirement was added.

Main files: `StudentSupervisorAppointment.tsx`, `StudentSupervisorApplications.tsx`, `SupervisorAppointmentApplicationPage.tsx`, `SupervisoryTeamManagement.tsx`, `ResearchAmendments.tsx`, `types/appointment.ts`, `services/appointmentsApi.ts`, and `utils/supervisorDocuments.ts`.

Backend: `co_supervision.py`, existing nomination/notification services, `models.py`, `serializers.py`, and migration `appointments.0016_supervisorapplication_project_course_codes`. This migration is recorded as applied locally; verify status in another environment.

### Lecturer

- Primary and supporting appointment requests share one searchable Requests/History workspace.
- Ongoing appointment records include permitted reviews and tracking while Coordinator approval is pending. Lecturer acceptance does not grant final primary appointment approval.
- My supervisees identifies the lecturer's actual active primary/supporting relationship. Supporting access does not imply primary-only nomination or decision authority.
- Research change review uses the shared detail layout and latest primary-Supervisor decision rule below.
- Lists preserve search, filters, view and page context. Review badges count permitted decisions rather than every visible/cancellable record.

Main files: `LecturerAppointmentRequests.tsx`, `LecturerResearchWorkspace.tsx`, `SupervisoryTeamManagement.tsx`, `ResearchAmendments.tsx`, `RequestWorkspacePrimitives.tsx`, and `utils/supervisorWorkspace.ts`.

### Programme Coordinator

- Appointment Requests is a decision queue: only records awaiting this Coordinator's permitted decision. Needs your decision/All ongoing toggles were removed; old saved focus values cannot broaden the queue or Next request list.
- History shows permitted final request outcomes. Active/ended appointments remain separate from these outcomes.
- Supervisory teams groups supervisors with scoped primary/supporting student counts, then a paged View students drilldown. Name/matric search is supported through the drilldown.
- Past appointments has its own paged filters for ended/replaced memberships.
- Capacity reassessments is a separate read-only tool, rather than a long section appended to the teams page. Request-specific Carryover links retain the original request context.
- Next request follows a known filtered queue position and is guarded during drafts/saves; missing/stale successors do not wrap or invent targets.
- Programme/delegation scope and active participant eligibility remain server-enforced.
- Under the latest research rule, Coordinator decision queues exclude title/abstract research changes. Transfer requests retain Coordinator review; see section 5.

Main files: `CoordinatorSupervisorWorkspace.tsx`, `CoordinatorBrowsePrimitives.tsx`, `CoordinatorSupervisorApprovals.tsx`, `LecturerResearchWorkspace.tsx`, `StaffResearchWorkspace.tsx`, `utils/coordinatorQueue.ts`, and `services/coordinatorWorkspaceApi.ts`.

Backend: `coordinator_workspace.py`, `coordinator_workspace_views.py`, `research_paging.py`. Read namespace: `/api/appointments/coordinator-workspace/` with request/team/appointment/carryover page and exact-detail endpoints.

Design/plan: `docs/superpowers/specs/2026-10-13-coordinator-supervisor-efficiency.md` and matching plan under `docs/superpowers/plans/`.

### Office Staff/Admin

- Uses the same shared filters/tables, supervisor groups and Past appointments presentation as Coordinator, with Needs attention, Appointment requests and Supervisory teams main sections plus secondary tools.
- Office Requests monitors all ongoing stages, rather than only Coordinator decisions. No approval powers were copied from Coordinator. History contains final outcomes.
- Capacity reassessments is a separate paged tool retaining Office authorise/revoke actions. Authorizing carryover neither approves an appointment nor creates capacity; approval eligibility/workload checks still apply.
- Needs attention is the default Office page. Secondary More tools retains the full legacy CSV export, Research records, workload monitoring and document requirements. The duplicate Records administration destination is removed; exact lifecycle controls remain.
- Research profiles retains the existing authorized correction/transfer entry points and chosen Student context. Programme-transfer relocation is proposed separately, not implemented.
- Supporting cancellation requires its reason and draft/busy guards. Existing appointment ending actions remain.
- Exact primary request keys use `request-<applicationId>` so application and appointment IDs are not confused. Legacy notification/detail keys still work. Contact/workload/approval fields remain available in exact Office details.
- Direct A-to-B detail navigation resets draft/error identity and prevents stale A actions from executing on B.
- Normal list/team/tool browsing avoids loading the entire legacy administration dataset.

Main files: `OfficeSupervisorWorkspace.tsx`, `StaffSupervisorBrowseContext.tsx`, `services/staffSupervisorWorkspaceApi.ts`, and the shared Coordinator browse components. Legacy specialized components remain `SupervisorAppointmentManagement.tsx`, `SupervisorWorkloadMonitoring.tsx`, `SupervisorDocumentRequirements.tsx`, `CapacityReassessments.tsx`, `StaffResearchWorkspace.tsx` and `ResearchAmendments.tsx`.

Backend read namespace: `/api/appointments/office-workspace/`. It shares bounded projections with Coordinator through explicit Office callbacks, requiring active Office role plus `is_staff`. Office browse scope remains all authorized programmes; Coordinator endpoints keep their stricter role/programme guards. A nullable legacy Panel carryover Student link is excluded before paging/counts/exact serialization to avoid a crash.

Plan: `docs/superpowers/plans/2026-10-13-office-supervisor-consistency.md`.

## 5. Current workflow rules: do not mix them

| Workflow | Current decision path |
| --- | --- |
| Primary Supervisor appointment | Student submits -> proposed Supervisor accepts/rejects -> Programme Coordinator approves/rejects |
| Supporting nomination | Primary Supervisor nominates -> nominated supporting lecturer reviews -> applicable Coordinator final approval; existing permission/eligibility rules apply |
| Research title/abstract change | Student requests -> active primary Supervisor makes final approve/reject decision |
| Programme transfer | Office initiates -> source Coordinator -> destination Coordinator; final approval updates both programme records atomically |

The Supervisor-only research decision is the latest change. Approval applies an audited profile revision immediately, preserving the original application. No extra Coordinator/Dean/Office approval stage is added. Stored legacy RESEARCH `PENDING_COORDINATOR` rows require primary Supervisor review, without rewriting historical events or automatically approving them. The effective display/review status can differ from the stored status; stale-decision checks still compare the raw expected status.

Transfers retain both Coordinator stages, including when one Coordinator manages both programmes. Preserve revision/team checks, locks, audit events, `retainTeam` acknowledgment and pending-transfer nomination blockers. Do not apply Supervisor-only research authority to transfers.

Routine staff lists/history/dossiers/reports/exports exclude Student-cancelled primary applications and Student-cancelled research changes. Student own history, authorized exact audit access and stored events remain. Office/system cancellations stay visible. Research cancellation ownership is derived from the cancellation event, not the original requester. Supporting/Panel nominations do not acquire a new Student cancel action.

Relevant backend: `request_visibility.py`, `research_amendments.py`, `amendment_views.py`, `research_paging.py`, `dashboard/amendment_tracking.py`, `dashboard/dossiers.py`, `dashboard/reports.py`.

## 6. Pending work and review traps

1. **Programme-transfer ownership is a proposal.** Read `docs/PROGRAMME_TRANSFER_HANDOFF_2026-10-13.md`. It recommends moving initiation/home/navigation to Registry while keeping compatibility, approvals and integration guards. It is not implemented or accepted ownership. Coordinate with Registry work before touching the mixed research/transfer surfaces.
2. **The stale new-research subtitle is resolved.** `supervisorResearchPage('new')` now describes the primary Supervisor final decision. This was corrected during the subsequent staff navigation update.
3. **Historical docs can mislead.** Older root paragraphs mention Coordinator All ongoing, a By student dropdown, Office Appointment records as the main tab, and two-stage research review. Use the latest dated requirements and actual role adapters.
4. **Live browser acceptance is incomplete for the newest business changes.** Course-code and Supervisor-only research changes passed recorded automated checks; their status entries explicitly do not claim completed live browser acceptance. Test those journeys before claiming end-to-end coverage.
5. **Large datasets need fixtures.** Real populated supporting/carryover/ended/large-page cases were mostly verified with tests, not by submitting live academic mutations. Preserve this distinction.
6. **Technical Administrator is not Office.** Incoming main adds this role; do not grant appointment mutation powers through an administration-style label or `is_staff` alone. Existing role guards remain authoritative.
7. **Shared files span multiple features.** `App.tsx`, `ResearchAmendments.tsx`, root documents and appointments models/serializers have uncommitted changes. Inspect all relevant diffs and coordinate before replacing sections.
8. **Do not recreate old UI clutter.** Keep the teams switch outside the card, default supervisor grouping, search-through-drilldown, distinct lifecycle/request history, visible filters, existing fonts and independent record pages.

No other specific defect is asserted by this handoff. Improvements in the next session should begin with inspection and a concrete user-approved scope.

## 7. Validation evidence and how to resume

These are recorded prior results from `PROJECT_STATUS.md`, not fresh runs during handoff preparation. Suite totals overlap and must not be added together:

- Office alignment: 42 staff browse/research backend tests; 65 broader workflow/capacity/cancellation/delegation checks; 106 frontend scripts. Affected Office/role/lazy-route tests, TypeScript/build were rerun after final link changes. Live Office search/history return, grouped drilldown, admin tools, correction/transfer forms and mobile layout checked without submitting academic decisions.
- Student withdrawal exclusions: 75 affected backend regressions, including history/audit, role scope, dossier/report/export consistency.
- Manual course codes: six focused API regressions, 109 affected backend cases, 106 frontend scripts; migration applied locally. Live browser acceptance not claimed.
- Supervisor-only research: 53 affected backend regressions, 106 frontend scripts, concurrency/legacy/stale-status and report checks; strengthened rendering check rerun. Live browser acceptance not claimed.
- Latest main integration: 172 backend integration cases and 118 frontend scripts; TypeScript, production build/security guards, Django system and pip checks. Read-only Office dashboard/appointment navigation and local HTTP service checks passed.

Useful targeted checks from the backend directory, using the root `.venv`:

```powershell
..\.venv\Scripts\python.exe manage.py test appointments.test_coordinator_workspace appointments.test_office_workspace appointments.test_research_paging appointments.test_student_cancellation_visibility appointments.test_application_course_codes appointments.test_research_amendments appointments.test_amendment_concurrency
..\.venv\Scripts\python.exe manage.py check
..\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run
```

Frontend has standalone `tsx` test scripts rather than an npm test command. Run affected scripts from `frontend` with `npx tsx <path>`, then the project's established broader checks when scope warrants:

- `src/components/CoordinatorEfficiency.test.tsx`
- `src/components/CoordinatorResearchPaging.test.tsx`
- `src/components/OfficeSupervisorWorkspace.test.tsx`
- `src/components/SupervisorRoleHierarchy.test.tsx`
- `src/components/LecturerAppointmentConsistency.test.tsx`
- `src/components/ResearchAmendments.test.tsx`
- `src/components/SupervisorApplicationClarity.test.tsx`
- `src/components/GlobalRecordNavigation.test.tsx`
- `src/utils/recordNavigation.test.ts`
- `src/utils/coordinatorQueue.test.ts`
- `src/utils/routeLazyLoading.test.ts`

```powershell
npm run lint
npm run build
npm run test:production-security
```

Also verify the impacted role journeys through the correct port, notification/deep-link access, browser/labelled Back returns, Requests/History filters and page restoration, mobile layout, dirty/busy guards, and unauthorized direct API access. Use the existing test fixtures for decisions instead of changing live records simply to populate screenshots.

A fresh synthetic Student test account was created locally and its login verified in this chat. Credentials are deliberately not stored in repository documents. Its original setup had the current semester/Cyber Security programme and no supervisor, research profile or requests; do not assume it remains untouched after the user tests it. Do not reset passwords or reseed accounts without authorization.

## 8. Ready-to-paste prompt for the next session

> Continue improving Supervisor Appointments in `C:/Users/User/Documents/FKSTM_Postgraduate_Management_System`, branch `codex/portal-consistency-and-toast`. Read `docs/SUPERVISOR_APPOINTMENTS_HANDOFF_2026-10-13.md`, the three root project documents, the current diff and relevant source before proposing changes. Preserve all modified/untracked work. Follow the existing role hierarchy, portal table fonts, separate stage/waiting columns, server-paged Coordinator/Office lists, supervisor-grouped teams with student search, and independent RecordPage details with one Back action and no visible list tabs. Preserve each role's permissions: Coordinator appointment decision-only queues, Office ongoing monitoring, Student result-only supporting visibility, and primary-Supervisor-only title/abstract research decisions. Programme transfer relocation to Registry is proposed, not implemented. Review the newest staff navigation/attention entries and remaining unverified live journeys. Inspect first, explain the intended improvement simply, critically review the plan as requested, implement only the agreed scope, verify it and update the root docs. Do not commit/push or submit live academic decisions unless asked.
