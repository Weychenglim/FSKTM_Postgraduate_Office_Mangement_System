# Programme transfer handoff to Student Registry

Prepared 13 October 2026 for Xiang, the recorded Registry module owner.

Status: proposed ownership and navigation change, ready for implementation planning. The existing feature is still running in Supervisor Appointments. This handoff does not implement a move, change approvals or indicate that Xiang has accepted ownership.

## Recommendation and reason

Make Student Registry the home and feature owner for programme transfers. Changing a student's enrolled degree programme belongs with student records; Supervisor Appointments should own primary/supporting appointments and research title/abstract changes. Workflow/Approval Tracking can continue displaying transfer progress as an integration consumer.

The repository README already places enrolment and Registry outside the five owned appointment/evaluation modules. The ownership plan assigns Registry/accounts, Letters and Announcements to Xiang. Git records the current transfer implementation under Weychenglim in commit 4206b227bfa4c6bc668c92edf5be95913602dc98, dated 29 September 2026. That provenance does not determine the best module owner.

Alternatives considered: keeping transfers in Supervisor Appointments leaves the enrolment action hard to discover; placing initiation in generic Workflow Tracking separates it from the student record. Registry initiation with existing Coordinator review is the clearest boundary.

## Intended user journey

1. Office opens Student Registry, selects a Student Record, and chooses Request programme transfer.
2. The form shows the current programme, a different eligible destination programme, a required reason and the existing supervisory team/task information.
3. Submission creates a transfer request without changing the current programme.
4. The current programme Coordinator reviews first; the destination programme Coordinator reviews second. Each explicitly acknowledges retention of the existing team and unfinished tasks.
5. Final approval updates both the Student programme and research-profile programme in one transaction and saves the revision/events. Rejection or cancellation leaves the programme unchanged.
6. Office can return to the student's pending request/history. Coordinators need an accessible, scoped transfer review queue and exact request page, with source-list state preserved.

Coordinator review may be a Registry subview or a dedicated Programme transfers workspace linked from Registry. Do not assume the existing Office-only Registry editing surface can be used by Coordinators; its read-only and programme/delegation scope must remain enforced.

## Ownership boundary

| Area | Proposed owner/responsibility |
| --- | --- |
| Transfer initiation, Office list/history, student-record links and transfer copy | Registry / Xiang |
| Transfer Coordinator queue/detail navigation | Registry / Xiang, integrated with existing Coordinator authorization |
| Research title/abstract requests and primary Supervisor decisions | Existing Supervisor module |
| Appointment/team identity, pending nomination blockers and retention checks | Existing appointment services; consume through their public functions |
| Programme/profile consistency and audited final transfer | Existing atomic transfer service, retained during the first move |
| Dashboard ageing, reports, notification links and approval tracking | Existing consumers; coordinate route changes without removing progress/history |

Start with navigation and feature ownership. Reuse the current backend and stored rows. A later service extraction can be discussed separately; moving Django model/table ownership is unnecessary for this handoff.

## Existing behavior to preserve

- Only active Office Staff/Admin can initiate. Students, primary supervisors, co-supervisors and Technical Administrators cannot initiate or approve transfers by that role alone.
- Transfers use PENDING_SOURCE_COORDINATOR -> PENDING_DESTINATION_COORDINATOR -> APPROVED, or REJECTED/CANCELLED. A Coordinator managing both programmes must still make two separate decisions.
- Research title/abstract changes use primary Supervisor-only final approval. Do not apply that rule to transfers or restore Coordinator approval for research changes.
- The student/account must be active, have an existing research profile, and have matching Student/profile programmes. Submission requires an active academic semester and an eligible destination Coordinator.
- Resolve pending research/transfer requests and pending Supervisor/co-supervisor/Panel nominations before transferring. Pending transfers also block relevant new nominations.
- Preserve stale-stage, profile-revision and supervisory-team checks, locking, immutable audit events, programme/delegation scope and authorized exact-record access.
- Retain current appointments and their workload allocation, Panel members, Marks and unfinished task assignments. Transfer does not recreate the team or erase history.
- Keep the Registry update guard: direct programme edits for a student with a research profile currently return HTTP 409 and must go through the audited transfer workflow.
- Students without a research profile currently have a separate permitted Registry programme-edit path. Extending transfer approvals to them is outside this move; preserve that behavior and its tests.
- No Dean, additional Supervisor or co-supervisor sign-off, extra uploads, course mapping or coursework management is introduced.

## Files and contracts to start from

Paths below are repository-relative.

| File | Why it matters |
| --- | --- |
| frontend/src/components/StudentRegistry.tsx | Student Record and existing edit/read-only controls; new Office entry point |
| backend/accounts/registry_views.py | Programme-edit integrity guard |
| backend/accounts/test_registry_hardening.py | Profile-present and profile-absent programme-edit tests |
| frontend/src/components/ResearchAmendments.tsx | Existing TRANSFER form, team snapshot and decision controls; also contains RESEARCH functionality that must stay |
| frontend/src/components/StaffResearchWorkspace.tsx and LecturerResearchWorkspace.tsx | Existing Office/Coordinator route and filter adapters |
| frontend/src/services/researchAmendmentsApi.ts | Existing options, submission, paging, decision and cancellation client |
| frontend/src/App.tsx, constants/routes.ts and utils/notificationLinks.ts | Shared route mounting and existing request deep links |
| backend/appointments/research_amendments.py | Transfer authorization, blockers, final atomic update and audit |
| backend/appointments/models.py | ResearchAmendment, ResearchAmendmentEvent and ResearchProfileRevision; preserve IDs/history |
| backend/appointments/amendment_views.py and amendment_urls.py | Existing authenticated API |
| backend/appointments/research_paging.py | Coordinator decision scope and type=TRANSFER server paging |
| backend/appointments/serializers.py and co_supervision.py | Call assert_no_pending_transfer; preserve integration |
| backend/dashboard/amendment_tracking.py and reports.py | Workflow status and report consumers |

Current API base: /api/appointments/research-amendments/.

- GET options/?studentId=<user ID>: profile, programme choices and canTransfer. studentId is the Student's User primary key, not a matric number or registry-row identifier.
- POST to the base: {"kind":"TRANSFER","studentId":123,"destinationProgramme":"<existing eligible programme>","reason":"<required reason>"}.
- GET to the base with page, type=TRANSFER and existing filters: scoped paged transfer records. Office uses all ongoing monitoring; Coordinators see only their permitted current decisions. The paged endpoint supports type filtering; the legacy unpaged collection can contain both kinds.
- GET <request ID>/: authorized exact request, including canDecide/canCancel and team/task information. Request ID differs from student/application/appointment IDs.
- POST <request ID>/decision/: decision APPROVE or REJECT, expectedStatus equal to the stored current status, reason as applicable, and retainTeam=true when approving a transfer. Derive permissions from the response and server, not just visible buttons.
- POST <request ID>/cancel/: required reason, preserving existing cancellation authority.

The current destination list comes from the amendment options service. Do not silently replace its eligibility behavior with Registry's programme constants during the navigation move.

## Suggested implementation sequence

1. Inspect the latest working tree: the current branch contains uncommitted course-code, research-approval and Office/Coordinator workspace changes after integrating main 93049a2. Coordinate a shared baseline before editing shared files; do not overwrite or cherry-pick the broad historical transfer commit wholesale.
2. Add the Registry Student Record action and dedicated transfer form/detail using the existing API. Separate transfer presentation from research-change presentation with focused components; avoid copying the whole mixed workspace.
3. Provide a scoped Coordinator transfer review destination and Office request/history access. Preserve filters, paging, Back behavior, busy/draft guards and existing role restrictions.
4. Keep old /supervisor-appointments/research-changes/<request ID> links working for saved requests and notifications. Route TRANSFER records to the new destination after an authorized detail read, or keep a compatibility detail page. Research requests remain on the existing route. Preserve selected Student context on initiation links.
5. Only after the Registry journey and Coordinator review are verified, remove transfer initiation from Supervisor Appointments and exclude TRANSFER from its routine research-change lists. Keep research requests, corrections/history and appointment protections working. Do not remove the only accessible transfer approval queue during cutover.
6. Update Registry's conflict guidance to point to the new action. Update README/module ownership, the three root project documents and relevant acceptance/checklist entries to reflect the agreed split.

## Acceptance checks

- Office can initiate from the exact Student Record and return to it; read-only Registry users cannot initiate.
- Other roles cannot bypass Office initiation or Coordinator programme/delegation scope through direct URLs/API calls.
- Source and destination review work in order, including the same-Coordinator two-stage case, required team acknowledgment and stale replay rejection.
- Final approval changes both programme records once; rejection/cancellation changes neither. Team, workload, Marks, unfinished tasks and existing audit history remain intact.
- Pending amendments/nominations, changed team/profile and missing destination Coordinator remain blocked.
- Direct Registry edit remains blocked when a research profile exists; the existing profile-absent edit path is unchanged.
- Pending and historical requests remain reachable through old/new links, notifications and workflow/report tracking; each normal list uses the appropriate request kind without losing authorized history.
- Research changes remain primary Supervisor-only; co-supervisors and Coordinators gain no research approval power. Manual course codes and ordinary appointment approval remain intact.
- Add meaningful Registry entry/return, role, queue and old-link regressions. Reuse transfer tests in appointments.test_research_amendments, test_amendment_concurrency, test_research_paging and accounts.test_registry_hardening; run affected frontend tests, TypeScript/build/security guards and Django checks. Do not exercise approvals on live student records for acceptance.

## Ready-to-share note

Xiang, I propose moving Programme transfer into Student Registry because it changes a student's enrolled programme. Please take the Registry entry point, request/history screens and Coordinator transfer review navigation. The existing audited transfer API already handles Office initiation, current/destination Coordinator decisions, team retention and atomic Student/research-profile updates; reuse it for the first move. Keep research title/abstract changes in Supervisor Appointments with primary Supervisor-only approval. Preserve existing requests, deep links, permissions and nomination blockers, and coordinate shared route/service edits with me. The sections above list the current contracts and acceptance checks.

## Preparation evidence

This handoff was checked against the current Registry programme guard, transfer service, form, routes, API and tests. No runtime code, schema, academic records or server processes were changed for its preparation. No message was sent to Xiang and no commit/push was made.
