# Programme transfer: Registry handoff update

Prepared 26 October 2026. Read alongside [the original transfer handoff](PROGRAMME_TRANSFER_HANDOFF_2026-10-13.md). This is a prepared handoff, not a completed relocation or an accepted assignment. No message has been sent to another owner.

## Agreed destination and current state

Programme-transfer initiation, Office tracking/history and Coordinator review navigation belong with Registry Management. Research profile pages remain focused on current research, saved revisions and permitted text corrections; Student research amendments retain primary-Supervisor final approval.

The current runtime still hosts transfers under Supervisor Appointments. `StudentRegistry.tsx` submits programme edits through `backend/accounts/registry_views.py`; that endpoint rejects direct edits with HTTP 409 when a research profile exists. Such students must use the audited transfer workflow to update both programme records together. The existing direct edit for students without a research profile is a separate path and must not be silently converted.

During Phase 2 research-profile presentation work, keep the existing transfer entry reachable until Registry provides a verified replacement. Split the confusing combined correction/transfer label into explicit actions, preserving current service and review behaviour. This is temporary presentation, not a second transfer workflow.

## Implementation ownership and files

Registry owner: add Request programme transfer to the exact Student Record; provide Office pending/history navigation and an accessible Coordinator review destination. Reuse existing services rather than copying academic mutation logic.

- `frontend/src/components/StudentRegistry.tsx`: exact student context and Office entry/return.
- `frontend/src/components/LecturerResearchWorkspace.tsx`, `StaffResearchWorkspace.tsx`, `ResearchAmendments.tsx`: current entry, creation, scoped queue and detail presentation; coordinate cutover rather than removing these first.
- `frontend/src/services/researchAmendmentsApi.ts`: existing request contracts.
- `backend/appointments/amendment_views.py`, `research_amendments.py`: options, capabilities, authorization, transitions and atomic application.
- `backend/accounts/registry_views.py`: programme-integrity guard and future actionable Registry guidance.
- `frontend/src/App.tsx` and route helpers: saved/deep links, notifications and return context.

## Contracts that must survive the move

- Office initiates a TRANSFER using Student User ID, eligible destination programme and a required reason. Submission does not change enrolment.
- Source Coordinator reviews, then destination Coordinator. Each approval acknowledges retaining the team and unfinished tasks, even if one actor manages both programmes.
- Final approval updates Student and research-profile programmes atomically and records the saved revision/events. Cancellation/rejection updates neither programme.
- Preserve active-participant/semester checks, recognised destination/eligible Coordinator checks, pending amendment/nomination blockers, current profile/team validation, expectedStatus replay protection, role/delegation scope and historical access limits.
- Preserve appointments, workloads, Panel membership, Marks, unfinished evaluator assignments and history. Do not add Coordinator authority over research title/abstract amendments.
- Reuse `/api/appointments/research-amendments/` and existing stored rows for the first move. No model/table migration is required merely to move navigation.
- Keep old authorized request URLs working. Do not remove the only Office creation entry or Coordinator decision queue before its replacement passes acceptance.

## Cutover acceptance

1. Office opens the exact Registry Student Record, submits, views progress/history and returns with context intact. Other roles cannot initiate by direct URL/API.
2. Both Coordinator stages, explicit acknowledgements, rejection/cancellation and stale replay behaviour pass isolated acceptance; programme/delegation boundaries remain enforced.
3. Final programme/profile values agree; team/Marks/task/history snapshots remain intact. Pending or changed prerequisites block correctly.
4. Pending and historical old links, notifications, reports and workflow tracking remain usable. Research requests continue primary-Supervisor-only.
5. Only then remove the temporary transfer action from the research profile and routine transfer navigation from Supervisor Appointments; replace Registry's 409 guidance with the new destination.
6. Update the three root project documents and acceptance guides with verified cutover evidence. Transfer for students without a research profile remains a separate policy/scope decision.

## Handoff boundary

This document does not implement Registry relocation, change approvals, seed records, send external messages or assign work to another chat. The current task continues with Phase 2 research-profile UI only.

## Phase 2 presentation completion

The research profile now has separate Correct research text and Request programme transfer actions, gated by existing Office capabilities. Creation URLs retain Student User ID and use changeType=CORRECTION or changeType=TRANSFER to preselect the existing permitted form. Actual authenticated Office navigation was verified without submitting either form. Registry cutover is still pending; do not interpret these presentation changes as relocation.
