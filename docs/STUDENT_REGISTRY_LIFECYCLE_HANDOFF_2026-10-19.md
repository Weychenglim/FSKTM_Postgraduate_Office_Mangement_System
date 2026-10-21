# Student Registry lifecycle handoff

Prepared 19 October 2026 for the teammate responsible for Student Registry.

**Main point:** Student academic lifecycle belongs naturally in Student Registry, and the current Registry already calls the shared lifecycle service when changing academic status. Review and consolidate the user journey; do not build another status engine.

Clarification requested in the follow-up: the recommendation is to make Registry the main student-specific home for lifecycle actions, with reusable blockers/pending-work/history or focused links. It is not a request to move the whole Manage Participants module, its backend/tables, lecturer lifecycle or acting delegations into Student Registry. Dashboard shortcuts can remain. The complete Office sequence is in [Office Dashboard operating workflow](OFFICE_DASHBOARD_OPERATING_WORKFLOW.md).

**Status:** discussion and source-inspection handoff. The user requested an explanation and a teammate handoff. No relocation, removal of Dashboard controls, backend rewrite, schema change or expanded authority was approved or implemented in this session. The receiving teammate's acceptance of additional ownership is not implied.

## Session context

The user asked for a source-grounded explanation and manual testing guidance for Office Dashboard and its linked tools. The agreed scope covered timeline/periods, semesters, capacity/workload, participants, acting delegations, reconciliation, reports and dossiers. This produced [Office Dashboard manual testing guide](OFFICE_DASHBOARD_MANUAL_TEST_GUIDE.md), with 115 case rows. It is a plan, not a record of executed manual tests.

After reviewing the explanation, the user asked whether participant lifecycle and acting Coordinator delegation belong under Registry. The discussion recommended:

| Responsibility | Natural feature home | Ownership status |
| --- | --- | --- |
| Student Active/Deferred/Graduated/Withdrawn | Student Registry / Student Record | Relevant to the receiving Registry owner |
| Lecturer Active/Retiring/Retired | Staff & Lecturers Registry | Adjacent work; do not assume included in student-only ownership |
| Acting Coordinator grants/revocation | Coordinator responsibilities / administration, possibly within Staff Registry | Adjacent permissions work; placement/owner needs agreement |
| Dashboard alerts and shortcuts | Dashboard | Continue as consumers of the same underlying records |

An important correction to the earlier chat explanation: lifecycle is not exclusively managed through Dashboard. Current `StudentRegistry.tsx` already has **Change Academic Status**, and its Registry PATCH endpoint delegates actual transitions to `transition_student`. The remaining question is how to make the overlapping entry points coherent and expose blockers/history usefully.

## What exists today

### Student Registry path

Office opens Registry → Students → Student Record → **Change Academic Status**.

- Choices use `studentStatusOptions`, which reuses shared allowed-transition rules.
- The UI sends `academicStatus` and mandatory `statusReason` through `updateStudent`.
- `PATCH /api/registry/students/{matricNo}/` validates the request and calls `accounts.participant_lifecycle.transition_student` inside the Registry transaction.
- Successful changes update the displayed student and reload the Registry list.
- On HTTP 409, the UI fetches the participant record to display blockers and can offer a link to the existing participant workspace.
- Terminal student statuses show that no further transitions are available.

The Registry already contains Students / Staff & Lecturers tabs. That UI structure does not by itself establish that every staff-management feature is integrated with the live lecturer lifecycle API; check the actual service path before changing it.

### Shared participant workspace

Dashboard → **Manage Participants** currently mounts `/dashboard/participant-lifecycle`.

It contains:

- Student/Lecturer search and filters.
- **Review**, blocker counts, pending work and lifecycle history.
- Reasoned lifecycle transitions.
- Reasoned cancellation of individual eligible pending workflows.
- Acting Coordinator delegations via `CoordinatorDelegations`.

Existing Dashboard, semester, Registry and dossier links may reach this route. Keep them functional during any later consolidation; do not remove the whole page just because student status editing exists in Registry.

## Business rules to preserve

### Student transitions

| Current status | Permitted next statuses |
| --- | --- |
| Active | Deferred, Graduated, Withdrawn |
| Deferred | Active, Withdrawn |
| Graduated | None through the portal |
| Withdrawn | None through the portal |

Every actual transition needs an authorised Office actor, a non-blank reason, server timestamp and immutable lifecycle audit. Backend enforcement remains authoritative.

| Operation | Required connected behaviour |
| --- | --- |
| Defer | Preserve appointments and submitted results; pause unfinished evaluation tasks where applicable; restrict new/advancing appointment work. |
| Reactivate | Resume only eligible paused tasks whose original period/appointment still permits continuation; otherwise retire them while preserving the relevant draft/history. |
| Graduate | Reject while pending Supervisor/co-supervisor/Panel work or unfinished operational Marks blocks graduation; successful graduation completes active appointments and preserves historical records. |
| Withdraw | Cancel relevant pending workflows, end appointments with the correct outcome and retire unfinished tasks; preserve submitted Marks, documents and history. |
| Cancel one pending workflow | Cancel only the selected authorised request, require reason, retain workflow history and release any applicable reservation. This does not itself withdraw the Student. |

The lifecycle service also coordinates research-amendment/transfer cancellation on applicable terminal transitions. Reuse it rather than reimplementing a shorter list of side effects in Registry.

### Academic status and sign-in status are different

Registry exposes both `academicStatus` and `accountStatus`.

- `academicStatus`: Active / Deferred / Graduated / Withdrawn.
- `accountStatus`: Verified / Suspended, controlling sign-in through the account's active flag.
- Password/account activation is another existing Registry concern; it does not mean an academic lifecycle transition occurred.

Do not equate Deferred with Suspended, or assume graduation/withdrawal disables login in the same way as account suspension. Terminal/deferred student academic access is governed by lifecycle rules; preserve permitted historical/read-only access. Existing suspension/session invalidation rules must remain intact.

### Permissions and integrity

- Lifecycle mutations require Office Staff/Admin with the backend-required staff authority. Registry read access for another role is not permission to change lifecycle.
- Keep Students, Lecturers and Programme Coordinators read-only for these Office mutations; normal programme/delegation visibility still applies to their authorised record reads.
- Preserve transactional rollback. A mixed Registry update must not leave a status transition/audit applied if another part of that same update is rejected.
- Preserve identifiers and existing rows/audits. Moving UI ownership does not require moving Django models/tables.
- Preserve stale-state conflict handling and participant-specific pending-work ownership checks.
- Never update the status field directly from an ordinary save, import, bulk-edit or admin shortcut that bypasses lifecycle side effects.
- Keep programme changes subject to the existing research-profile consistency/transfer guard; lifecycle consolidation is not permission to bypass programme-transfer approval.

## API and file map

Repository-relative paths below are starting points.

| File | Responsibility |
| --- | --- |
| `frontend/src/components/StudentRegistry.tsx` | Existing student list/details, academic-status action, reason and blocker UI |
| `frontend/src/utils/registryStatus.ts` | Status options derived from shared transitions; blocker descriptions and Registry counts |
| `frontend/src/components/ParticipantLifecycleManagement.tsx` | Shared Review, blockers, transitions, individual pending cancellation and history |
| `frontend/src/services/participantLifecycleApi.ts` | Existing typed participant read/transition/cancellation client |
| `frontend/src/types/participantLifecycle.ts` | Statuses, blockers, pending work, actor/affected-record audits |
| `frontend/src/utils/participantLifecycle.ts` | Shared frontend transition table |
| `frontend/src/components/CoordinatorDelegations.tsx` | Existing Office acting-grant/revoke UI |
| `frontend/src/services/coordinatorDelegationsApi.ts` | Existing delegation client; adjacent work |
| `frontend/src/App.tsx`, `frontend/src/constants/routes.ts` | Registry/participant mounting, role gates and links |
| `backend/accounts/registry_views.py`, `registry_urls.py` | Existing student Registry PATCH integration, read scope and account guards |
| `backend/accounts/participant_lifecycle.py` | Authoritative student/lecturer transitions, blockers, cancellation, audits and connected side effects |
| `backend/accounts/participant_views.py`, `participant_urls.py` | Office participant API boundary |
| `backend/accounts/models.py` | Student status, lecturer lifecycle, audit and delegation records |
| `backend/accounts/delegations.py`, `delegation_views.py`, `authorization.py` | Acting access, revocation and effective Coordinator scope |
| `backend/marks/services.py` | Shared task pause/resume/retire behaviour consumed by lifecycle |
| `backend/appointments/appointment_lifecycle.py` | Appointment ending behaviour consumed by lifecycle |

Participant endpoints, with `/api` prefix:

```text
GET  /api/accounts/participants/?type=STUDENT
GET  /api/accounts/participants/students/{matricNo}/
POST /api/accounts/participants/students/{matricNo}/transition/
POST /api/accounts/participants/students/{matricNo}/pending-work/cancel/
```

Existing request shapes differ between the two entry points; preserve the client contract:

```json
// Registry PATCH: /api/registry/students/{matricNo}/
{"academicStatus":"Deferred","statusReason":"Approved deferment"}

// Participant transition POST
{"targetStatus":"DEFERRED","reason":"Approved deferment"}

// Individual pending-work cancellation POST
{"recordType":"SUPERVISOR_APPLICATION","recordId":123,"reason":"Office cancellation reason"}
```

These are illustrative payloads; replace identifiers/reasons with designated test values. `recordId` refers to the actual workflow, not a student ID. Participant responses expose status, account access, blocker counts, pending work and immutable audit data. Expect validation errors (400), denied access (403), not found (404) and lifecycle/blocker conflicts (409), with the existing authentication handling unchanged.

## Suggested next work, subject to agreed scope

1. Inspect the current Registry status flow before designing anything. Confirm what already works through real persisted APIs.
2. Agree the remaining UX scope: keep the existing status action and add student-specific blockers/pending-work/history, or link to a focused lifecycle review. Decide whether Dashboard keeps a central participant workspace or becomes a shortcut. Do not treat this handoff as approval to remove either entry point.
3. Reuse the shared lifecycle service, transition helper and types. Extract reusable presentation only where needed; do not copy backend business logic into Registry.
4. If adding a student-specific review link, preserve the selected matric number and return context. Current generic participant navigation should not be assumed to preselect the student automatically.
5. Refresh Registry list/detail and other affected summaries after success. Preserve reasons/feedback on failed operations and handle stale data without overwriting another record.
6. Coordinate links from Dashboard, semesters, dossiers, reports and reconciliation if routes change. Retain existing deep links/compatibility until all consumers are covered.
7. Agree staff lifecycle and delegation ownership separately. Neither is automatically part of the receiving teammate's student-only task.
8. Update requirements/design/status only to reflect the approved final scope and actual evidence.

No additional approval stage, new lifecycle state, bulk status migration or database migration is proposed here.

## Acceptance checks for the Registry owner

Use fictional disposable records. Terminal operations run last.

- [ ] Existing Change Academic Status reaches the lifecycle service and persists after reload/re-login.
- [ ] Blank/whitespace reason rejects; unchanged status does not create a false transition audit.
- [ ] Only permitted next statuses appear; direct API requests cannot reverse Graduated/Withdrawn.
- [ ] Defer/reactivate checks include real unfinished Marks and retained appointments; test both resumable and expired-period tasks.
- [ ] Graduation shows actual blockers and does not partially change status, appointments or audits.
- [ ] Individual request cancellation has correct student/workflow ownership, reason and history; it does not cancel unrelated work.
- [ ] Withdrawal preserves submitted Marks and cancels/ends/retires relevant unfinished work correctly.
- [ ] Academic status changes remain separate from Verified/Suspended account controls and activation-email flows.
- [ ] Non-Office and Office without required lifecycle authority cannot mutate; read-only Registry views stay read-only.
- [ ] Failed mixed updates roll back both lifecycle and ordinary record edits; programme-transfer guards remain.
- [ ] Duplicate/stale submissions, switching student records and failed reads never display/change the wrong student's data.
- [ ] Audit shows correct actor, reason, previous/new status and affected records; Malaysia date/time display is verified.
- [ ] Dashboard links and existing participant/delegation/lecturer functions remain usable after any approved UI consolidation.
- [ ] Mobile/keyboard, unsaved navigation, loading, empty, conflict and retry states are checked.

Existing coverage to inspect/extend:

- `backend/accounts/test_registry.py`: reason requirement, lifecycle audit integration, terminal status, permissions and account status.
- `backend/accounts/test_registry_hardening.py`, `test_registry_scope.py`: identity/scope, protected updates and programme integrity.
- `backend/accounts/test_participant_lifecycle.py`: connected task/appointment/workflow effects, Office authority and lifecycle history.
- `frontend/src/components/RegistryReadAccess.test.ts`, `RegistryImportIntegration.test.ts`: existing Registry boundaries.
- Relevant participant/Registry helper and mounted UI tests discovered in the current checkout.
- For separately agreed staff/delegation work: `backend/accounts/test_delegations.py`, `backend/appointments/test_coordinator_delegation.py`, and frontend Coordinator delegation tests.

These files were inspected as source; their presence is not a fresh passing-test claim. No regression suite or browser acceptance was executed for this handoff. Run the affected tests and manual cases against the actual implementation being delivered.

## Other handoffs and documentation

- [Project Requirements](../PROJECT_REQUIREMENTS.md), especially Academic Participant Lifecycle Management and Temporary Acting-Coordinator Delegation. Current written requirements still locate the shared participant workspace under Dashboard; update that only after a relocation decision.
- [Architecture and Coding Design](../ARCHITECTURE_AND_CODING_DESIGN.md), participant lifecycle and acting-Coordinator sections.
- [Project Status](../PROJECT_STATUS.md): latest implementation/verification takes precedence over historical notes.
- [Programme transfer handoff](PROGRAMME_TRANSFER_HANDOFF_2026-10-13.md): earlier related proposal for Registry ownership; transfer approval is a separate workflow and must not be conflated with lifecycle status.
- [Office Dashboard manual guide](OFFICE_DASHBOARD_MANUAL_TEST_GUIDE.md), P01–P09/G01–G04: lifecycle/delegation scenarios and connected Dashboard checks. Earlier guides may have stale Registry integration statements; use current source and latest status.

## Ready-to-share message

> During the Dashboard review, we identified student academic lifecycle as part of Student Registry's responsibility. The current Registry already has Change Academic Status and calls the shared backend transition service, so please review the existing integration rather than rebuild it. The proposed follow-up is to make Registry the coherent student-specific home for status, blockers, pending-work review and history while preserving Dashboard links and all appointment/Marks/audit side effects. No UI move or removal has been implemented or approved yet. Lecturer lifecycle and acting Coordinator delegation are adjacent responsibilities needing separate ownership agreement. Please read this handoff and the existing programme-transfer handoff, confirm the scope, then plan the smallest integration change and verify it with the listed tests and manual cases.
