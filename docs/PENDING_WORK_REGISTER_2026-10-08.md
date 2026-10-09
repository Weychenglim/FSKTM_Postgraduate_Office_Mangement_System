# Pending work and decisions register

Updated 8 October 2026, Malaysia. Start here when resuming development. This document consolidates our discussion; creating it does not implement the pending access changes or certify the whole system.

Release update, 9 October: [PR #13](https://github.com/Weychenglim/FSKTM_Postgraduate_Office_Mangement_System/pull/13) merged the accumulated application/documentation changes into `main` at `fc8265a3b22e15430be6349955f7a240b72c7bfa`. R01 is complete for this release. Fresh verification passes all 683 backend tests, 75 frontend scripts, TypeScript/build and configuration/documentation checks; local `main` application files match the tested source. See the newest [Project Status](../PROJECT_STATUS.md) section for exact evidence. T01–T06 remain pending.

## Direction to retain

- Office Staff/Admin is one business role. Django superuser/admin access is a separate technical privilege; Django's `is_staff` means admin-site eligibility, not someone's employment category.
- Office users should use the main portal for daily work. Django admin should be used by technical administrators only when maintenance or investigation is needed.
- Governed decisions, Marks mutations and configuration changes must use validated, transactional, audited workflow services. Technical admin access must not provide another route around those services.
- Apply the permission separation across all five owned modules and their shared dependencies, not just Marks. Existing portal controls should be preserved rather than duplicated in new configuration screens.
- Scope remains Dashboard/Timeline, Supervisor Appointments, Panel Appointments, Marks, and Workflow/Approval Tracking. Registry, general Files, FAQ, Letters and Announcements remain separate ownership/integration work.
- A general permission editor in the main portal is not required by this discussion. Django already provides technical Users/Groups/model-permission configuration. Faculty rules and coordinator identity policy remain deferred.

## Current facts: implemented versus pending

| Item | Current state |
| --- | --- |
| Office admin menu | Demo Office is staff, not superuser, with Django model permissions only for Marks. Other admin sections are registered but hidden from that account. This is its account configuration. |
| Governed admin screens | Marks, appointment workflows, timeline and academic configuration have protected inspection screens. This does not mean every admin model is read-only. |
| Other admin editing | Technical accounts with sufficient permissions can still edit accounts/profiles, letter templates, announcements and notifications. Review their intended maintenance boundary before changing them. |
| Marks daily work | Correction/reopening moved into the Office portal; reasons, reviewed-state conflicts and before/after audits are implemented. Marks admin is inspection-only. |
| Permission configuration | Django Users/Groups/model permissions exist. Portal role/scope rules exist. No general portal permission-management screen is implemented. |
| Technical-only admin login | **Pending implementation.** Ordinary Office admin access has not yet been removed. |
| Business authority independent of admin flags | **Pending implementation.** Several services still require `is_staff`; clearing that flag now would break legitimate Office actions. |
| Local services | Latest checked startup: Django 8000, portal 3001, existing `fsktm_pg_office` database, mocks/demo login disabled. Check live health when resuming; this is a snapshot, not a promise services remain running. |
| Git/release | The accumulated release is committed, pushed and merged into `main` through PR #13. Earlier restart snapshots did not publish it; the 9 October release update above supersedes their uncommitted/unpushed state. |

## Priority 1: separate technical admin access from Office workflow authority

These are implementation tasks, not completed features. Finish this coherent slice before disabling Office admin eligibility.

| ID | Task | Status | Done when |
| --- | --- | --- | --- |
| T01 | Define the technical admin access rule and authorized account set. Initial recommendation: dedicated technical superusers; a delegated technical group is optional, not an approved requirement. | Pending design detail | The rule identifies who may enter `/admin/`, who manages permissions and how recovery access is retained. Do not promote a routine Office account merely to show more menus. |
| T02 | Establish shared business authorization for affected Office actions. Keep role, active-account/lifecycle eligibility, programme scope and explicit action permissions where required. | Pending implementation | Service and API checks agree; an Office role label alone cannot silently grant privileged corrections or maintenance authority. |
| T03 | Replace affected `is_staff` dependencies with the agreed business checks, including API capabilities shown to the frontend. | Pending implementation | Every dependency in the matrix below works for authorized Office accounts without requiring Django admin access; unauthorized actors remain rejected. |
| T04 | Restrict Django admin login to the technical access rule. Retain read-only governed records and review editable maintenance sections. | Pending implementation; depends on T01–T03 | Ordinary Office users cannot enter admin; designated technical users can; protected models still reject direct writes, including by superusers. |
| T05 | Update seed/bootstrap and existing-account permission configuration consistently. Use explicit, repeatable setup; preserve credentials and intended authority. | Pending implementation | Existing authorized Office users retain their portal functions; future accounts receive the intended business permissions; no automatic superuser promotion or credential reseeding occurs. |
| T06 | Verify access separation and update all source documents, guides and checklist evidence. | Pending acceptance; depends on T01–T05 | Portal actions succeed for authorized non-admin Office users; wrong-role/unprivileged/inactive actors reject; technical admin access works; audit/validation/concurrency behavior remains intact. |

### Confirmed dependency matrix

These source checks establish where the work applies. They are not evidence that permission separation has already been completed.

| Module/dependency | Existing portal functionality | Remaining admin-flag coupling / source |
| --- | --- | --- |
| Marks | Correction/reopening, completion windows and closure preview | `is_staff` in [views](../backend/marks/views.py), [services](../backend/marks/services.py) and [completion windows](../backend/marks/completion_windows.py). Correction/reopening also requires `marks.change_markentry`; preserve that explicit authority or an equivalently reviewed business permission. |
| Dashboard participant lifecycle | Deferral/reactivation, withdrawal/graduation and Lecturer retirement | [participant lifecycle service](../backend/accounts/participant_lifecycle.py) requires Office role plus `is_staff`. Core timeline authorization is already role based. |
| Supervisor research amendments/transfers | Audited profile changes and approval chains | [research amendments](../backend/appointments/research_amendments.py) uses active Office plus `is_staff` for Office authority. |
| Supervisor/Panel carryover capacity reassessment | Reasoned capacity policy/reassessment | [capacity reassessment](../backend/appointments/capacity_reassessment.py) uses active Office plus `is_staff`. Ordinary candidate capacity management has role-based checks. |
| Workflow approval scope / acting delegation | Programme-bound delegation grant/revocation and audits | [delegations](../backend/accounts/delegations.py) uses active Office plus `is_staff`. Core decisions/reports still retain their separate actor/programme rules. |
| Other modules: regression boundary only | Letters and Announcements have existing authority checks | Their code also references staff/superuser flags. Check for regressions from shared access changes; do not silently redesign teammate-owned workflows or treat them as newly owned modules. |

Suggested T06 test cases: authorized Office with no admin access can correct/reopen Marks, grant/revoke completion windows, manage participant lifecycle, perform authorized research changes/reassessment and manage delegation; direct admin entry fails; equivalent unauthorized requests fail without data/audit changes; technical users inspect governed models but cannot bypass workflows. Browser and automated evidence must be recorded separately.

### Django admin after this slice

The target is an occasional technical tool offering record search/inspection, audit investigation, authorized account/access administration and explicitly retained maintenance functions. Routine Office users should have no need to open it. Exactly which non-governed maintenance edits remain available is a T04 review decision, not a claim that all editing will disappear.

## Priority 2: finish owned-module acceptance

Most features below already exist. Their status means complete browser/persisted evidence is still missing, not that every feature needs to be built from scratch. Fix only demonstrated defects and add relevant regressions.

| ID | Slice | Status | Acceptance work |
| --- | --- | --- | --- |
| A01 | Supporting supervision | Awaiting remaining acceptance | Membership/nomination, rejection/cancellation, ending/replacement, role conflicts, history/privacy, capacity and dependent Marks behavior. Formerly the next slice before the technical-admin discussion; resume after T01–T06. |
| A02 | Research amendments/programme transfers | Awaiting remaining acceptance | Required reasons, sequential approvals, stale/conflicting changes, programme eligibility/scope, retained revisions/team/history and relevant dependent tasks. |
| A03 | Acting delegation | Awaiting remaining acceptance | Grant/expiry/revocation, programme boundaries, queue refresh, decision races and responsibility/retirement combinations. This business delegation is different from the deferred cross-account identity policy. |
| A04 | Carryover and semester handover | Awaiting remaining acceptance | Reassessment decisions, capacity effects, term transitions, historical/current records and unchanged submitted Marks. |
| A05 | Dashboard/Timeline/reports/exports/dossiers/reconciliation | Awaiting remaining combinations | Role/semester filters, timeline CRUD/history/loading failures, operational totals, exports, public/private dossier fields, reconciliation preview/apply/audit and data consistency. Core flows have earlier evidence; do not erase it or certify all combinations from it. |
| A06 | Remaining compound lifecycle/Marks cases | Awaiting remaining acceptance | Supporting appointment/nomination closure, Coordinator responsibilities/delegations, audit-outage rollback/concurrent lifecycle transitions, reactivation after the original appointment ended, all assignment-bypass variants and historical access through every relevant screen/export. |
| A07 | Outstanding browser/environment cases | Awaiting specific acceptance | Browser file saving/download, native-alert behavior and relevant availability-date controls still need their exact checks. Successful completion-window date entry does not prove every date field works. |

The [406-clause checklist](FIVE_MODULE_ACCEPTANCE_CHECKLIST.md) is the detailed evidence inventory: **48 Passed, 358 Awaiting acceptance** at this snapshot. These are clause-level acceptance statuses, not a development-completion percentage. A passed test candidate is not automatic proof of every compound requirement.

## Completed work to preserve

Do not reopen these as unfixed defects without a new reproduction. Each report limits its own evidence.

| Work | Evidence / limitation |
| --- | --- |
| Original five review fixes: role overlap, Timeline request contract, admin bypasses, negative Marks validation, Marks semester projection/filter | Current requirements/status supersede the [3 October historical handoff](HANDOFF_FINAL_OWNED_MODULE_REVIEW_2026-10-03.md), which described the defects before fixes. Later browser slices and regressions are recorded in the checklist. |
| Protected Django admin boundaries | [Admin acceptance](DJANGO_ADMIN_ACCEPTANCE_2026-10-06.md). Its earlier editable submitted-Marks path is superseded by portal migration; do not instruct Office users to correct Marks through current admin. |
| Appointment cancellation/replacement | [Replacement acceptance](APPOINTMENT_REPLACEMENT_ACCEPTANCE_2026-10-07.md). |
| Appointment rejection/capacity/private-file paths | [Failure-path acceptance](APPOINTMENT_FAILURE_PATH_ACCEPTANCE_2026-10-07.md). |
| Advanced Marks scope/backup/semester/completion windows | [Advanced Marks acceptance](ADVANCED_MARKS_ACCEPTANCE_2026-10-07.md). |
| Submitted Marks portal migration | [Portal Marks acceptance](MARKS_PORTAL_ACTIONS_ACCEPTANCE_2026-10-07.md); 142 Marks backend tests passed on 8 October. |
| Core participant lifecycle and display/privacy fixes | [Lifecycle acceptance](PARTICIPANT_LIFECYCLE_ACCEPTANCE_2026-10-08.md); final 253 scoped backend tests, 75 frontend scripts, TypeScript and production build passed. This is not a new full-backend or production certificate. |

## Separate queues: release, deployment, teammate work and deferred policy

| ID | Work | Status / boundary | Done when |
| --- | --- | --- | --- |
| R01 | Review, commit and integrate accumulated changes | Completed for this release, 9 October | PR #13 is merged, local `main` application files match the tested source, and Project Status records verification/review/merge evidence. Future T/A slices require their own review and integration. |
| P01 | Actual production-host configuration | Pending deployment verification | Provision/check the shared PostgreSQL authentication cache across workers; verify host/proxy/HTTPS/cookies/CORS, static/media/private documents, SMTP, database migrations, backup/restore and rollback on the intended host. Shared-cache code exists; production provisioning and multi-worker proof remain. |
| P02 | Final acceptance on deployment-like environment | Pending after remaining development | Repeat critical role workflows and authorization checks on the real configuration; record observed results and remaining limitations. |
| X01 | Student/staff Registry and routine account management in the portal | Teammate/shared scope; integration missing | The responsible owner implements the missing backend/persisted creation/import/edit/account flow. Until then, technical account provisioning may still need Django admin. This is additional work beyond T01–T06. |
| X02 | General file repository/student submissions and FAQ | Teammate scope; integration gaps | Real persistence and authorized upload/download or FAQ backend are supplied and tested. Supervisor application documents are already a separate live feature. |
| X03 | Announcements/notifications and Letters | Teammate acceptance / existing limits | Complete recipient/attachment/unread/deep-link acceptance and template/details/print checks; clarify the absent issued-letter ledger if required. Do not infer a new ledger requirement from this register. |
| D01 | Faculty rules | Deferred external decision | Obtain faculty-confirmed rules before implementation; do not invent results/classification policy. |
| D02 | Coordinator identity policy | Deferred external decision | Resolve cross-account identity/conflict policy separately. Existing same-account Supervisor/Panel separation remains enforced. |

## How to resume and keep this current

1. Read this register, then the newest sections of [requirements](../PROJECT_REQUIREMENTS.md), [design](../ARCHITECTURE_AND_CODING_DESIGN.md) and [status](../PROJECT_STATUS.md). Historical handoffs are evidence, not the latest state.
2. Check branch/diff, running project services and database identity. Preserve accumulated changes and synthetic evidence. Never reseed normal accounts or reset credentials just to start a server.
3. Start with T01–T06. Settle the technical access rule and per-action business authority, then implement/verify the bounded slice. Do not disable Office flags before legitimate portal flows are protected and tested.
4. Continue A01–A07 in order, completing prerequisite configuration and recording actual browser plus persisted assertions for each slice. Use synthetic controlled records for terminal lifecycle/closure tests.
5. After each slice, update its stable IDs here, all affected source documents and the checklist evidence. Mark Completed only with a report/check reference; keep proposed design, implemented code and accepted behavior distinct.
6. For human testing, use the [simple guide](SIMPLE_END_TO_END_TEST_GUIDE.md); use the [detailed whole-system guide](WHOLE_SYSTEM_END_TO_END_TEST_GUIDE.md) for variants. Login passwords remain in the private ignored local account sheet, never in this register or Git.

Suggested continuation instruction: **“Read the pending-work register and the three root source documents. Start with T01–T06: separate technical Django admin access from Office business permissions across the five modules and their shared dependencies. Preserve existing functionality, account authority and uncommitted work; verify before continuing to supporting supervision.”**
