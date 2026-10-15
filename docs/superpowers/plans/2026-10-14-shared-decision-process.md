# Shared decisions and confirmations implementation plan

> For agentic workers: use subagent-driven-development for independent backend and module migrations; the controller implements the shared contract and integrates/reviews all changes. Execute continuously under the user's explicit approval. Preserve the dirty current branch; no reset, cleanup, commit or push.

Goal: consistent reviewer decisions and user confirmations across the five owned modules, with safe asynchronous outcomes and correct Coordinator programme boundaries.

Architecture: `DecisionDialog` uses `PortalModal`, shared buttons/toast, and RecordDraft. Module callbacks retain their APIs/business rules. `completeDecision` distinguishes a failed save from a saved decision whose reload fails. No generic backend approval engine or new dependency.

Spec: the user-approved conversation proposal, including confirmation vs reviewer approval. See the task contracts below. Existing official acting Coordinator delegations remain authorised; transfers keep separate source/destination stages. Student pending Panel privacy remains.

## Contract (shared by Tasks 2–4)

Create `frontend/src/components/DecisionDialog.tsx` and `frontend/src/utils/decisionSubmission.ts`.

```ts
export interface DecisionOutcome { refreshFailed?: boolean; successMessage?: string }
export function completeDecision(save:()=>Promise<unknown>,refresh?:()=>Promise<unknown>):Promise<DecisionOutcome>;
// save errors propagate; only refresh errors produce {refreshFailed:true}.
export interface DecisionDialogProps {
 isOpen:boolean; decisionKey?:string|number; title:string;
 context?:React.ReactNode; message:React.ReactNode; children?:React.ReactNode;
 confirmLabel:string; cancelLabel?:string; kind?:'review'|'confirmation';
 tone?:'info'|'warning'|'danger'; canConfirm?:boolean; busy?:boolean; dirty?:boolean;
 successMessage:string; onClose:()=>void;
 onConfirm:()=>Promise<void|false|DecisionOutcome>|void;
 onReload?:()=>Promise<unknown>;
}
```

Always keep the dialog component mounted in a stable host so its success toast survives closure. A callback throws on a failed save, returns false only if no save was attempted, and resolves on success. It must not close the dialog or silently catch save failure. Core owns its pending flag/error/403 or 409 blocking and one success toast. Keep typed reasons on ordinary failure. On permission/conflict show Review latest record (when onReload supplied), requiring fresh review; do not blindly retry. Back/Escape/backdrop while dirty asks to discard inside the same dialog; no nested modal. During save all dismissal/submission blocked. Success stays on record and reloads progress/history. Generic labels and visible internal references are forbidden. Normal draft saving needs no decision dialog.

## Task 1: authoritative Panel programme scope

Files: backend/appointments/panel_access.py, views.py, relevant workspace projections; new targeted authorization regression file.
- [x] Add failing tests for linked Student/profile programme mismatch: Coordinator queue/exact capability and approve/reject must deny and leave workflow unchanged. Normal matching and delegated stages must pass. Unlinked legacy records remain auditable, but do not grant Coordinator decisions without an authoritative Student link.
- [x] Run targeted tests and record expected failure.
- [x] Introduce one effective Panel programme predicate using linked Student programme, validate profile agreement for mutation, recheck after locks. Apply to queue/detail/action capabilities, keep Office audit and existing assigned reviewer access.
- [x] Run scope/delegation/Panel tests; report findings, no live academic decisions.

## Task 2: shared dialog/controller (root)

Files: DecisionDialog.tsx, utils/decisionSubmission.ts and behavioral tests.
- [x] Test duplicate-submit exclusion, save failure vs reload failure, conflict blocking, and rendered context/labels.
- [x] Implement the contract above; retain existing focus/modal/RecordDraft conventions.
- [x] Verify helpers/types and mobile rendering before using in migrations.

## Task 3: Supervisor review migrations

Files: ResearchAmendments.tsx, LecturerAppointmentRequests.tsx, CoordinatorSupervisorApprovals.tsx, SupervisoryTeamManagement.tsx and affected tests. Own these files exclusively.
- [x] Replace inline research/transfer decisions, primary/supporting Lecturer and Coordinator review controls with the shared dialog.
- [x] Preserve reason requirements, transfer acknowledgements, expected status, optional approval note, eligibility and exact-record access. Only actual research primary Supervisor approves research changes.
- [x] Keep record open after successful decision, reload state/history, preserve errors/reasons and guarded Next request.
- [x] Migrate supporting nomination decisions/ending in shared management too; leave initial nomination forms as forms.
- [x] Run focused tests; add meaningful state/outcome regressions.

## Task 4: user confirmation migrations

Files: MarkEntryDetail.tsx, SubmittedMarksActions.tsx, MarksCompletionWindows.tsx, TimelineManagement.tsx, WorkflowReconciliationCentre.tsx, EvaluationTaskAssignment.tsx and affected tests. Own these files exclusively.
- [x] Migrate final Marks submission, correction/reopening, completion-window grant/revoke, Timeline deletion and Workflow apply-repair confirmation.
- [x] Keep large correction/repair previews and original required fields. Backup evaluator is an exception assignment confirmed by its authorised user; retain preview/acknowledgement and use same final confirmation.
- [x] Never introduce another reviewer/approval stage; normal drafts/add/edit saves remain forms.
- [x] Do not close before save resolves or treat reload failure as a failed save. API conflict/version checks remain.
- [x] Run focused tests and report state/outcome cases.

## Task 5: Panel and lifecycle integration/review (root)

Files: LecturerPanelAppointments.tsx, RecommendationDetailsDrawer.tsx, StudentSupervisorAppointment.tsx, AppointmentEndControl.tsx; shared affected tests.
- [x] Migrate Panel selected-member/Coordinator acceptance and rejection, cancellation and Student request cancellation; include required reason in one dialog rather than inline+second modal.
- [x] Migrate primary/Panel appointment end control retaining required outcome/reason and permissions.
- [x] Fresh frontend suite/type/build and scoped backend suite; targeted independent code review of new work only.
- [x] Restart local API if backend changes require it; visually check dialogs across roles without submitting live decisions, then capture proof. Update all three root project docs and handoff with measured evidence/limits.

## Pre-flight review

Task 1 has no frontend ownership overlap. Task 2 produces the exact contract consumed by Tasks 3/4/5. Tasks 3/4 own disjoint files. Task 5 alone touches Panel/lifecycle hosts and shared primitives. Existing source-regex tests may need intentional changes but privacy/scope/guard assertions cannot be removed. No task grants new approval authority, invents required reasons or changes records outside isolated tests.

## Completion — 15 October 2026

Tasks 1–5 are implemented and integrated. AppLayout owns role/session-scoped outcome feedback so successful saves remain visible if the saved record host changes. The dialog retains conflict blocking across close/reopen; Office Marks waits for a successful latest-record reload after a committed mutation. Two independent-review findings were fixed and re-reviewed. Verification: 140 frontend test scripts and 100 scoped backend tests pass; final affected tests, TypeScript, production build, Django checks, migration dry-run and whitespace checks pass. Live Coordinator acceptance/rejection and Office ending previews were checked without submitting academic changes, including required reasons, discard handling, focus return and 320px fit. Lecturer research had no pending request; other mutation states use automated coverage rather than fabricated live records. See PROJECT_STATUS.md for evidence paths and limits. No commit or push.
