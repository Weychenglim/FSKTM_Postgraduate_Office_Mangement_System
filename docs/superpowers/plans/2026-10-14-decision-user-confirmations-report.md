# Task 4: user confirmations

Implemented the six owned hosts: MarkEntryDetail, SubmittedMarksActions, MarksCompletionWindows, TimelineManagement, WorkflowReconciliationCentre, and EvaluationTaskAssignment.

Final actions now use DecisionDialog with kind confirmation, explicit consequences and action labels. Draft/add/edit forms remain forms. Correction score/comment previews, audited reasons, optimistic version, repair fingerprint, eligibility, backup original-task selection and acknowledgements remain. MarkEntryDetail retains its mounted record and becomes locally submitted/read-only only after successful submission. Root owns parent callback and mounting integration.

Mutation failures propagate to the shared controller and retain entered reasons. completeDecision separates successful saves from failed refresh. Timeline, reconciliation and backup loaders accept strict propagation for this path while retaining existing normal loader error handling. Completion history propagation preserves the reviewed window until the final dialog closes. SubmittedMarksActions remains mounted even when updated Office capabilities disappear. Success feedback belongs to the shared dialog; no extra parent success callback is invoked for correction/reopening.

Validation:
- Added decisionUserConfirmations.test.ts: eight source contract regressions covering all six hosts, Office optimistic concurrency/delta validation, repair fingerprint and backup acknowledgement/original task preservation.
- Updated SubmittedMarksActions.test.tsx fixture to include student and evaluator context.
- Initial six migration assertions failed before edits; final focused run passed 14 tests (the eight new assertions plus existing Marks permissions, completion-window rendering/API, submitted correction validation/audit rendering and reconciliation utility tests).
- Frontend TypeScript noEmit passed after the final local submitted-state change.
- Scoped git diff --check passed.

Limitations: the new migration regressions inspect host contracts; interactive duplicate-submit, dismissal, failed-save and committed-refresh-failure behavior is exercised by the root's shared controller/dialog tests. Parent mount/reload changes and browser visual integration are root-owned. No live marks submissions, window mutations, repairs, backup assignments or timeline deletion were performed. No commit, push or reset.
